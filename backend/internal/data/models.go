package data

// Point is a generic date/value pair used for time-series charts.
type Point struct {
	Date  string  `json:"date"`  // YYYY-MM-DD
	Value float64 `json:"value"`
}

// RacePrediction holds Garmin's predicted race times (in seconds) for a date.
type RacePrediction struct {
	Date         string  `json:"date"`
	Time5K       float64 `json:"time5k"`
	Time10K      float64 `json:"time10k"`
	TimeHalf     float64 `json:"timeHalf"`
	TimeMarathon float64 `json:"timeMarathon"`
}

// VO2Point tracks VO2 max per sport over time.
type VO2Point struct {
	Date     string  `json:"date"`
	Sport    string  `json:"sport"`
	VO2Max   float64 `json:"vo2max"`
	MaxMet   float64 `json:"maxMet"`
}

// TrainingLoadPoint tracks acute vs chronic load and ACWR ratio.
type TrainingLoadPoint struct {
	Date       string  `json:"date"`
	Acute      float64 `json:"acute"`
	Chronic    float64 `json:"chronic"`
	Ratio      float64 `json:"ratio"`
	ACWRStatus string  `json:"acwrStatus"`
}

// ReadinessPoint captures training readiness and its contributing factors.
type ReadinessPoint struct {
	Date              string  `json:"date"`
	Score             float64 `json:"score"`
	Level             string  `json:"level"`
	FeedbackShort     string  `json:"feedbackShort"`
	SleepFactor       float64 `json:"sleepFactor"`
	RecoveryFactor    float64 `json:"recoveryFactor"`
	ACWRFactor        float64 `json:"acwrFactor"`
	StressFactor      float64 `json:"stressFactor"`
	HRVFactor         float64 `json:"hrvFactor"`
	SleepHistFactor   float64 `json:"sleepHistoryFactor"`
	RecoveryTimeHours float64 `json:"recoveryTimeHours"`
	HRVWeeklyAvg      float64 `json:"hrvWeeklyAvg"`
}

// SleepPoint summarizes one night of sleep.
type SleepPoint struct {
	Date           string  `json:"date"`
	OverallScore   float64 `json:"overallScore"`
	DeepMinutes    float64 `json:"deepMinutes"`
	LightMinutes   float64 `json:"lightMinutes"`
	RemMinutes     float64 `json:"remMinutes"`
	AwakeMinutes   float64 `json:"awakeMinutes"`
	TotalMinutes   float64 `json:"totalMinutes"`
	AvgStress      float64 `json:"avgStress"`
	AvgRespiration float64 `json:"avgRespiration"`
	AvgSpO2        float64 `json:"avgSpo2"`
	RestingHR      float64 `json:"restingHr"`
}

// DailySummary rolls up the user daily summary (steps, calories, RHR, stress, body battery).
type DailySummary struct {
	Date              string  `json:"date"`
	Steps             float64 `json:"steps"`
	StepGoal          float64 `json:"stepGoal"`
	TotalCalories     float64 `json:"totalCalories"`
	ActiveCalories    float64 `json:"activeCalories"`
	DistanceMeters    float64 `json:"distanceMeters"`
	RestingHR         float64 `json:"restingHr"`
	MinHR             float64 `json:"minHr"`
	MaxHR             float64 `json:"maxHr"`
	IntensityMinutes  float64 `json:"intensityMinutes"`
	BodyBatteryHigh   float64 `json:"bodyBatteryHigh"`
	BodyBatteryLow    float64 `json:"bodyBatteryLow"`
	AvgStress         float64 `json:"avgStress"`
	AvgRespiration    float64 `json:"avgRespiration"`
	FloorsAscended    float64 `json:"floorsAscended"`
}

// PhysioPoint captures a physiological reading (HRV, HR, SpO2, respiration, stress).
type PhysioPoint struct {
	Date        string  `json:"date"`
	HRV         float64 `json:"hrv"`
	HR          float64 `json:"hr"`
	SpO2        float64 `json:"spo2"`
	Respiration float64 `json:"respiration"`
	Stress      float64 `json:"stress"`
}

// FitnessAgePoint tracks biological age vs chronological age and its drivers.
type FitnessAgePoint struct {
	Date              string  `json:"date"`
	ChronologicalAge  float64 `json:"chronologicalAge"`
	CurrentBioAge     float64 `json:"currentBioAge"`
	HealthyBioAge     float64 `json:"healthyBioAge"`
	BMI               float64 `json:"bmi"`
	RestingHR         float64 `json:"restingHr"`
	VO2Max            float64 `json:"vo2max"`
}

// HydrationPoint tracks daily hydration intake and estimated sweat loss.
type HydrationPoint struct {
	Date          string  `json:"date"`
	IntakeML      float64 `json:"intakeMl"`
	SweatLossML   float64 `json:"sweatLossMl"`
}

// ScorePoint is a generic classified score (endurance / hill).
type ScorePoint struct {
	Date           string  `json:"date"`
	Classification float64 `json:"classification"`
}

// Zones holds the athlete's heart-rate zone floors and power zones.
type Zones struct {
	RestingHR              float64   `json:"restingHr"`
	MaxHR                  float64   `json:"maxHr"`
	LactateThresholdHR     float64   `json:"lactateThresholdHr"`
	LactateThresholdSpeed  float64   `json:"lactateThresholdSpeed"`
	HRZoneFloors           []float64 `json:"hrZoneFloors"`
	PowerZoneFloors        []float64 `json:"powerZoneFloors"`
}

// Profile is the athlete's identity.
type Profile struct {
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Gender    string `json:"gender"`
	BirthDate string `json:"birthDate"`
	Email     string `json:"email"`
}

// Bundle is the fully-parsed dataset returned by the loader.
type Bundle struct {
	Profile         Profile             `json:"profile"`
	Zones           Zones               `json:"zones"`
	RacePredictions []RacePrediction    `json:"racePredictions"`
	VO2Max          []VO2Point          `json:"vo2max"`
	TrainingLoad    []TrainingLoadPoint `json:"trainingLoad"`
	Readiness       []ReadinessPoint    `json:"readiness"`
	Sleep           []SleepPoint        `json:"sleep"`
	Daily           []DailySummary      `json:"daily"`
	Physio          []PhysioPoint       `json:"physio"`
	FitnessAge      []FitnessAgePoint   `json:"fitnessAge"`
	Hydration       []HydrationPoint    `json:"hydration"`
	Endurance       []ScorePoint        `json:"endurance"`
	Hill            []ScorePoint        `json:"hill"`
}
