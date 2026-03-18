export interface LinearityResult {
  slope: number
  intercept: number
  rSquared: number
  rmsError: number
  maxDeviation: number
  linearityPercent: number
  stdErr: number
  residuals: number[]
  fit: number[]
}

export interface ApertureResult extends LinearityResult {
  xValues: number[]       // log(f-stop)
  rawFStops: number[]
  resistances: number[]
  logResistances: number[] // log(R) — the y-values used in regression
}

export interface ShutterResult extends LinearityResult {
  xValues: number[]       // log2(speed)
  shutterSpeeds: number[]
  resistances: number[]
  logResistances: number[] // log(R) — the y-values used in regression
}

export interface LightMeterResult extends LinearityResult {
  evLevels: number[]
  resistances: number[]
}

export interface EVErrorResult {
  evLevels: number[]
  measuredResistances: number[]
  expectedResistances: number[]
  evErrors: number[]
  maxError: number
  rmsError: number
  meanSignedError: number
  withinHalf: number
  withinOne: number
  beyondOne: number
}

export interface AdjustmentResult {
  optimalR: number
  maxEvError: number
}

export interface ApertureRow extends Record<string, number | null> {
  fStop: number | null
  resistance: number | null
}

export interface ShutterRow extends Record<string, number | null> {
  shutterSpeed: number | null
  resistance: number | null
}

export interface LightMeterRow extends Record<string, number | null> {
  evLevel: number | null
  resistance: number | null
}
