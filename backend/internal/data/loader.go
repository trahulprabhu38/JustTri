package data

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

// Store loads and caches the parsed Garmin bundle from a data directory.
type Store struct {
	dir    string
	mu     sync.RWMutex
	bundle *Bundle
}

// NewStore creates a store rooted at the given Garmin export directory.
func NewStore(dir string) *Store {
	return &Store{dir: dir}
}

// Bundle returns the cached bundle, loading it on first access.
func (s *Store) Bundle() (*Bundle, error) {
	s.mu.RLock()
	if s.bundle != nil {
		b := s.bundle
		s.mu.RUnlock()
		return b, nil
	}
	s.mu.RUnlock()
	return s.Reload()
}

// Reload re-parses everything from disk and refreshes the cache.
func (s *Store) Reload() (*Bundle, error) {
	b := &Bundle{}
	s.parseProfile(b)
	s.parseZones(b)
	s.parseRacePredictions(b)
	s.parseVO2(b)
	s.parseTrainingLoad(b)
	s.parseReadiness(b)
	s.parseSleep(b)
	s.parseDaily(b)
	s.parsePhysio(b)
	s.parseFitnessAge(b)
	s.parseHydration(b)
	s.parseScores(b)

	s.mu.Lock()
	s.bundle = b
	s.mu.Unlock()
	return b, nil
}

// ---------- helpers ----------

// find returns the first file in the dir whose base name contains sub.
func (s *Store) find(sub string) string {
	entries, err := os.ReadDir(s.dir)
	if err != nil {
		return ""
	}
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		if strings.Contains(e.Name(), sub) && strings.HasSuffix(e.Name(), ".json") {
			return filepath.Join(s.dir, e.Name())
		}
	}
	return ""
}

func readJSON(path string, v any) bool {
	if path == "" {
		return false
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		return false
	}
	return json.Unmarshal(raw, v) == nil
}

// epochToDate converts epoch milliseconds to YYYY-MM-DD (UTC).
func epochToDate(ms float64) string {
	if ms <= 0 {
		return ""
	}
	t := time.UnixMilli(int64(ms)).UTC()
	return t.Format("2006-01-02")
}

// normDate trims a timestamp/date string to YYYY-MM-DD.
func normDate(s string) string {
	if len(s) >= 10 {
		return s[:10]
	}
	return s
}

func num(m map[string]any, key string) float64 {
	if v, ok := m[key]; ok {
		if f, ok := v.(float64); ok {
			return f
		}
	}
	return 0
}

func str(m map[string]any, key string) string {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

// ---------- parsers ----------

func (s *Store) parseProfile(b *Bundle) {
	var p map[string]any
	if readJSON(s.find("user_profile.json"), &p) {
		b.Profile = Profile{
			FirstName: str(p, "firstName"),
			LastName:  str(p, "lastName"),
			Gender:    str(p, "gender"),
			BirthDate: str(p, "birthDate"),
			Email:     str(p, "emailAddress"),
		}
	}
}

func (s *Store) parseZones(b *Bundle) {
	var hr []map[string]any
	if readJSON(s.find("heartRateZones"), &hr) && len(hr) > 0 {
		z := hr[0]
		b.Zones.RestingHR = num(z, "restingHeartRateUsed")
		b.Zones.MaxHR = num(z, "maxHeartRateUsed")
		b.Zones.LactateThresholdHR = num(z, "lactateThresholdHeartRateUsed")
		b.Zones.HRZoneFloors = []float64{
			num(z, "zone1Floor"), num(z, "zone2Floor"), num(z, "zone3Floor"),
			num(z, "zone4Floor"), num(z, "zone5Floor"),
		}
	}
	var bio []map[string]any
	if readJSON(s.find("bioMetrics_latest"), &bio) && len(bio) > 0 {
		b.Zones.LactateThresholdSpeed = num(bio[0], "lactateThresholdSpeed")
		if b.Zones.LactateThresholdHR == 0 {
			b.Zones.LactateThresholdHR = num(bio[0], "lactateThresholdHeartRate")
		}
	}
	var pz []map[string]any
	if readJSON(s.find("powerZones"), &pz) && len(pz) > 0 {
		for i := 1; i <= 7; i++ {
			if v, ok := pz[0]["zone"+itoa(i)+"Floor"]; ok {
				if f, ok := v.(float64); ok {
					b.Zones.PowerZoneFloors = append(b.Zones.PowerZoneFloors, f)
				}
			}
		}
	}
}

func itoa(i int) string {
	return string(rune('0' + i))
}

func (s *Store) parseRacePredictions(b *Bundle) {
	var raw []map[string]any
	if !readJSON(s.find("RunRacePredictions"), &raw) {
		return
	}
	// Keep the latest entry per calendar date.
	byDate := map[string]RacePrediction{}
	for _, r := range raw {
		d := normDate(str(r, "calendarDate"))
		if d == "" {
			continue
		}
		byDate[d] = RacePrediction{
			Date:         d,
			Time5K:       num(r, "raceTime5K"),
			Time10K:      num(r, "raceTime10K"),
			TimeHalf:     num(r, "raceTimeHalf"),
			TimeMarathon: num(r, "raceTimeMarathon"),
		}
	}
	for _, v := range byDate {
		b.RacePredictions = append(b.RacePredictions, v)
	}
	sort.Slice(b.RacePredictions, func(i, j int) bool {
		return b.RacePredictions[i].Date < b.RacePredictions[j].Date
	})
}

func (s *Store) parseVO2(b *Bundle) {
	var raw []map[string]any
	if !readJSON(s.find("MetricsMaxMetData"), &raw) {
		return
	}
	for _, r := range raw {
		b.VO2Max = append(b.VO2Max, VO2Point{
			Date:   normDate(str(r, "calendarDate")),
			Sport:  str(r, "sport"),
			VO2Max: num(r, "vo2MaxValue"),
			MaxMet: num(r, "maxMet"),
		})
	}
	sort.Slice(b.VO2Max, func(i, j int) bool { return b.VO2Max[i].Date < b.VO2Max[j].Date })
}

func (s *Store) parseTrainingLoad(b *Bundle) {
	var raw []map[string]any
	if !readJSON(s.find("MetricsAcuteTrainingLoad"), &raw) {
		return
	}
	for _, r := range raw {
		acute := num(r, "dailyTrainingLoadAcute")
		chronic := num(r, "dailyTrainingLoadChronic")
		ratio := 0.0
		if chronic > 0 {
			ratio = acute / chronic
		}
		b.TrainingLoad = append(b.TrainingLoad, TrainingLoadPoint{
			Date:       epochToDate(num(r, "calendarDate")),
			Acute:      acute,
			Chronic:    chronic,
			Ratio:      ratio,
			ACWRStatus: str(r, "acwrStatus"),
		})
	}
	sort.Slice(b.TrainingLoad, func(i, j int) bool { return b.TrainingLoad[i].Date < b.TrainingLoad[j].Date })
}

func (s *Store) parseReadiness(b *Bundle) {
	var raw []map[string]any
	if !readJSON(s.find("TrainingReadinessDTO"), &raw) {
		return
	}
	byDate := map[string]ReadinessPoint{}
	for _, r := range raw {
		d := normDate(str(r, "calendarDate"))
		if d == "" {
			continue
		}
		byDate[d] = ReadinessPoint{
			Date:              d,
			Score:             num(r, "score"),
			Level:             str(r, "level"),
			FeedbackShort:     str(r, "feedbackShort"),
			SleepFactor:       num(r, "sleepScoreFactorPercent"),
			RecoveryFactor:    num(r, "recoveryTimeFactorPercent"),
			ACWRFactor:        num(r, "acwrFactorPercent"),
			StressFactor:      num(r, "stressHistoryFactorPercent"),
			HRVFactor:         num(r, "hrvFactorPercent"),
			SleepHistFactor:   num(r, "sleepHistoryFactorPercent"),
			RecoveryTimeHours: num(r, "recoveryTime") / 60.0,
			HRVWeeklyAvg:      num(r, "hrvWeeklyAverage"),
		}
	}
	for _, v := range byDate {
		b.Readiness = append(b.Readiness, v)
	}
	sort.Slice(b.Readiness, func(i, j int) bool { return b.Readiness[i].Date < b.Readiness[j].Date })
}

func (s *Store) parseSleep(b *Bundle) {
	var raw []map[string]any
	if !readJSON(s.find("sleepData"), &raw) {
		return
	}
	for _, r := range raw {
		d := normDate(str(r, "calendarDate"))
		if d == "" {
			continue
		}
		deep := num(r, "deepSleepSeconds")
		light := num(r, "lightSleepSeconds")
		rem := num(r, "remSleepSeconds")
		awake := num(r, "awakeSleepSeconds")
		var score, spo2 float64
		if sc, ok := r["sleepScores"].(map[string]any); ok {
			score = num(sc, "overallScore")
		}
		if sp, ok := r["spo2SleepSummary"].(map[string]any); ok {
			spo2 = num(sp, "averageSPO2")
		}
		total := deep + light + rem + awake
		if total == 0 {
			continue
		}
		b.Sleep = append(b.Sleep, SleepPoint{
			Date:           d,
			OverallScore:   score,
			DeepMinutes:    deep / 60,
			LightMinutes:   light / 60,
			RemMinutes:     rem / 60,
			AwakeMinutes:   awake / 60,
			TotalMinutes:   total / 60,
			AvgStress:      num(r, "avgSleepStress"),
			AvgRespiration: num(r, "averageRespiration"),
			AvgSpO2:        spo2,
		})
	}
	sort.Slice(b.Sleep, func(i, j int) bool { return b.Sleep[i].Date < b.Sleep[j].Date })
}

func (s *Store) parseDaily(b *Bundle) {
	var raw []map[string]any
	if !readJSON(s.find("UDSFile"), &raw) {
		return
	}
	for _, r := range raw {
		d := normDate(str(r, "calendarDate"))
		if d == "" {
			continue
		}
		ds := DailySummary{
			Date:             d,
			Steps:            num(r, "totalSteps"),
			StepGoal:         num(r, "dailyStepGoal"),
			TotalCalories:    num(r, "totalKilocalories"),
			ActiveCalories:   num(r, "activeKilocalories"),
			DistanceMeters:   num(r, "totalDistanceMeters"),
			RestingHR:        num(r, "restingHeartRate"),
			MinHR:            num(r, "minHeartRate"),
			MaxHR:            num(r, "maxHeartRate"),
			IntensityMinutes: num(r, "moderateIntensityMinutes") + num(r, "vigorousIntensityMinutes"),
			FloorsAscended:   num(r, "floorsAscendedInMeters"),
		}
		if bb, ok := r["bodyBattery"].(map[string]any); ok {
			if list, ok := bb["bodyBatteryStatList"].([]any); ok {
				for _, it := range list {
					if m, ok := it.(map[string]any); ok {
						switch str(m, "bodyBatteryStatType") {
						case "HIGHEST":
							ds.BodyBatteryHigh = num(m, "statsValue")
						case "LOWEST":
							ds.BodyBatteryLow = num(m, "statsValue")
						}
					}
				}
			}
		}
		if st, ok := r["allDayStress"].(map[string]any); ok {
			if agg, ok := st["aggregatorList"].([]any); ok {
				for _, it := range agg {
					if m, ok := it.(map[string]any); ok && str(m, "type") == "TOTAL" {
						ds.AvgStress = num(m, "averageStressLevel")
					}
				}
			}
		}
		if resp, ok := r["respiration"].(map[string]any); ok {
			ds.AvgRespiration = num(resp, "avgWakingRespirationValue")
		}
		b.Daily = append(b.Daily, ds)
	}
	sort.Slice(b.Daily, func(i, j int) bool { return b.Daily[i].Date < b.Daily[j].Date })
}

func (s *Store) parsePhysio(b *Bundle) {
	// Primary source: healthStatusData daily metrics (HRV, HR, SpO2).
	var raw []map[string]any
	if readJSON(s.find("healthStatusData"), &raw) {
		for _, r := range raw {
			d := normDate(str(r, "calendarDate"))
			if d == "" {
				continue
			}
			p := PhysioPoint{Date: d}
			if metrics, ok := r["metrics"].([]any); ok {
				for _, it := range metrics {
					m, ok := it.(map[string]any)
					if !ok {
						continue
					}
					switch str(m, "type") {
					case "HRV":
						p.HRV = num(m, "value")
					case "HR":
						p.HR = num(m, "value")
					case "SPO2":
						p.SpO2 = num(m, "value")
					}
				}
			}
			b.Physio = append(b.Physio, p)
		}
	}
	// Enrich with wellness health-snapshot HRV/respiration/stress where available.
	var wa []map[string]any
	if readJSON(s.find("wellnessActivities"), &wa) {
		snap := map[string]PhysioPoint{}
		for _, r := range wa {
			d := normDate(str(r, "calendarDate"))
			if d == "" {
				continue
			}
			pt := snap[d]
			pt.Date = d
			if list, ok := r["summaryTypeDataList"].([]any); ok {
				for _, it := range list {
					m, ok := it.(map[string]any)
					if !ok {
						continue
					}
					switch str(m, "summaryType") {
					case "RMSSD_HRV":
						pt.HRV = num(m, "avgValue")
					case "HEART_RATE":
						pt.HR = num(m, "avgValue")
					case "RESPIRATION":
						pt.Respiration = num(m, "avgValue")
					case "STRESS":
						pt.Stress = num(m, "avgValue")
					case "SPO2":
						pt.SpO2 = num(m, "avgValue")
					}
				}
			}
			snap[d] = pt
		}
		// Merge snapshot data into existing physio points (or add new).
		idx := map[string]int{}
		for i, p := range b.Physio {
			idx[p.Date] = i
		}
		for d, pt := range snap {
			if i, ok := idx[d]; ok {
				if pt.HRV > 0 {
					b.Physio[i].HRV = pt.HRV
				}
				if pt.Respiration > 0 {
					b.Physio[i].Respiration = pt.Respiration
				}
				if pt.Stress > 0 {
					b.Physio[i].Stress = pt.Stress
				}
			} else {
				b.Physio = append(b.Physio, pt)
			}
		}
	}
	sort.Slice(b.Physio, func(i, j int) bool { return b.Physio[i].Date < b.Physio[j].Date })
}

func (s *Store) parseFitnessAge(b *Bundle) {
	var raw []map[string]any
	if !readJSON(s.find("fitnessAgeData"), &raw) {
		return
	}
	for _, r := range raw {
		b.FitnessAge = append(b.FitnessAge, FitnessAgePoint{
			Date:             normDate(str(r, "asOfDateGmt")),
			ChronologicalAge: num(r, "chronologicalAge"),
			CurrentBioAge:    num(r, "currentBioAge"),
			HealthyBioAge:    num(r, "healthyAllBioAge"),
			BMI:              num(r, "bmi"),
			RestingHR:        num(r, "rhr"),
			VO2Max:           num(r, "biometricVo2Max"),
		})
	}
	sort.Slice(b.FitnessAge, func(i, j int) bool { return b.FitnessAge[i].Date < b.FitnessAge[j].Date })
}

func (s *Store) parseHydration(b *Bundle) {
	var raw []map[string]any
	if !readJSON(s.find("HydrationLogFile"), &raw) {
		return
	}
	byDate := map[string]*HydrationPoint{}
	for _, r := range raw {
		d := normDate(str(r, "calendarDate"))
		if d == "" {
			continue
		}
		if byDate[d] == nil {
			byDate[d] = &HydrationPoint{Date: d}
		}
		byDate[d].IntakeML += num(r, "valueInML")
		byDate[d].SweatLossML += num(r, "estimatedSweatLossInML")
	}
	for _, v := range byDate {
		b.Hydration = append(b.Hydration, *v)
	}
	sort.Slice(b.Hydration, func(i, j int) bool { return b.Hydration[i].Date < b.Hydration[j].Date })
}

func (s *Store) parseScores(b *Bundle) {
	var end []map[string]any
	if readJSON(s.find("EnduranceScore"), &end) {
		for _, r := range end {
			b.Endurance = append(b.Endurance, ScorePoint{
				Date:           epochToDate(num(r, "calendarDate")),
				Classification: num(r, "classification"),
			})
		}
		sort.Slice(b.Endurance, func(i, j int) bool { return b.Endurance[i].Date < b.Endurance[j].Date })
	}
	var hill []map[string]any
	if readJSON(s.find("HillScore"), &hill) {
		for _, r := range hill {
			b.Hill = append(b.Hill, ScorePoint{
				Date:           epochToDate(num(r, "calendarDate")),
				Classification: num(r, "hillScoreClassificationId"),
			})
		}
		sort.Slice(b.Hill, func(i, j int) bool { return b.Hill[i].Date < b.Hill[j].Date })
	}
}
