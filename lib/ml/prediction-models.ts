/**
 * Professional ML Prediction Models
 * Multiple algorithms for stock/ETF price prediction
 */

import { MLFeatures } from './feature-engineering'

export interface PredictionResult {
  predictedPrice: number
  confidence: number // 0-1
  lowerBound: number
  upperBound: number
  modelName: string
}

export interface ModelPerformance {
  mae: number // Mean Absolute Error
  rmse: number // Root Mean Squared Error
  mape: number // Mean Absolute Percentage Error
  r2: number // R-squared
  accuracy: number // Directional accuracy (% of correct up/down predictions)
}

/**
 * Linear Regression Model with Gradient Descent
 */
export class LinearRegressionModel {
  private weights: number[] = []
  private bias: number = 0
  private learningRate: number = 0.01
  private iterations: number = 1000

  train(X: number[][], y: number[]): void {
    const numFeatures = X[0].length
    this.weights = new Array(numFeatures).fill(0)
    this.bias = 0

    for (let iter = 0; iter < this.iterations; iter++) {
      const predictions = X.map(x => this.predict(x)[0])

      // Calculate gradients
      const weightGrads = new Array(numFeatures).fill(0)
      let biasGrad = 0

      for (let i = 0; i < X.length; i++) {
        const error = predictions[i] - y[i]
        for (let j = 0; j < numFeatures; j++) {
          weightGrads[j] += error * X[i][j]
        }
        biasGrad += error
      }

      // Update weights
      for (let j = 0; j < numFeatures; j++) {
        this.weights[j] -= (this.learningRate * weightGrads[j]) / X.length
      }
      this.bias -= (this.learningRate * biasGrad) / X.length
    }
  }

  predict(x: number[]): [number, number] {
    let prediction = this.bias
    for (let i = 0; i < x.length; i++) {
      prediction += this.weights[i] * x[i]
    }

    // Confidence based on magnitude of prediction relative to bias
    // Higher confidence when weights contribute more to prediction
    const weightContribution = Math.abs(prediction - this.bias)
    const confidence = Math.min(0.85, Math.max(0.6, 0.7 + (weightContribution * 0.05)))

    return [prediction, confidence]
  }

  getFeatureImportance(): number[] {
    return this.weights.map(w => Math.abs(w))
  }
}

/**
 * Decision Tree for regression
 */
class DecisionTreeNode {
  featureIndex?: number
  threshold?: number
  value?: number
  left?: DecisionTreeNode
  right?: DecisionTreeNode
}

export class DecisionTreeModel {
  private root: DecisionTreeNode | null = null
  private maxDepth: number = 10
  private minSamplesSplit: number = 5

  train(X: number[][], y: number[]): void {
    this.root = this.buildTree(X, y, 0)
  }

  private buildTree(X: number[][], y: number[], depth: number): DecisionTreeNode {
    const n = X.length

    // Stopping criteria
    if (depth >= this.maxDepth || n < this.minSamplesSplit) {
      return { value: this.mean(y) }
    }

    // Find best split
    const { featureIndex, threshold, leftIndices, rightIndices } = this.findBestSplit(X, y)

    if (leftIndices.length === 0 || rightIndices.length === 0) {
      return { value: this.mean(y) }
    }

    // Recursively build left and right subtrees
    const leftX = leftIndices.map(i => X[i])
    const leftY = leftIndices.map(i => y[i])
    const rightX = rightIndices.map(i => X[i])
    const rightY = rightIndices.map(i => y[i])

    return {
      featureIndex,
      threshold,
      left: this.buildTree(leftX, leftY, depth + 1),
      right: this.buildTree(rightX, rightY, depth + 1),
    }
  }

  private findBestSplit(X: number[][], y: number[]): {
    featureIndex: number
    threshold: number
    leftIndices: number[]
    rightIndices: number[]
  } {
    let bestMSE = Infinity
    let bestFeature = 0
    let bestThreshold = 0
    let bestLeft: number[] = []
    let bestRight: number[] = []

    const numFeatures = X[0].length

    for (let featureIndex = 0; featureIndex < Math.min(numFeatures, 20); featureIndex++) {
      const values = X.map(x => x[featureIndex])
      const uniqueValues = [...new Set(values)].sort((a, b) => a - b)

      for (let i = 0; i < Math.min(uniqueValues.length - 1, 10); i++) {
        const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2

        const leftIndices: number[] = []
        const rightIndices: number[] = []

        for (let j = 0; j < X.length; j++) {
          if (X[j][featureIndex] <= threshold) {
            leftIndices.push(j)
          } else {
            rightIndices.push(j)
          }
        }

        if (leftIndices.length === 0 || rightIndices.length === 0) continue

        const leftY = leftIndices.map(i => y[i])
        const rightY = rightIndices.map(i => y[i])

        const mse = this.calculateMSE(leftY, this.mean(leftY)) + this.calculateMSE(rightY, this.mean(rightY))

        if (mse < bestMSE) {
          bestMSE = mse
          bestFeature = featureIndex
          bestThreshold = threshold
          bestLeft = leftIndices
          bestRight = rightIndices
        }
      }
    }

    return {
      featureIndex: bestFeature,
      threshold: bestThreshold,
      leftIndices: bestLeft,
      rightIndices: bestRight,
    }
  }

  predict(x: number[]): [number, number] {
    if (!this.root) return [0, 0]

    const prediction = this.traverse(x, this.root)
    const confidence = 0.7 // Decision trees have moderate confidence

    return [prediction, confidence]
  }

  private traverse(x: number[], node: DecisionTreeNode): number {
    if (node.value !== undefined) {
      return node.value
    }

    if (node.featureIndex !== undefined && node.threshold !== undefined) {
      if (x[node.featureIndex] <= node.threshold && node.left) {
        return this.traverse(x, node.left)
      } else if (node.right) {
        return this.traverse(x, node.right)
      }
    }

    return 0
  }

  private mean(arr: number[]): number {
    return arr.reduce((sum, val) => sum + val, 0) / arr.length
  }

  private calculateMSE(y: number[], yPred: number): number {
    return y.reduce((sum, val) => sum + Math.pow(val - yPred, 2), 0) / y.length
  }
}

/**
 * Random Forest - Ensemble of Decision Trees
 */
export class RandomForestModel {
  private trees: DecisionTreeModel[] = []
  private numTrees: number = 10

  train(X: number[][], y: number[]): void {
    this.trees = []

    for (let i = 0; i < this.numTrees; i++) {
      // Bootstrap sampling
      const { bootstrapX, bootstrapY } = this.bootstrap(X, y)

      const tree = new DecisionTreeModel()
      tree.train(bootstrapX, bootstrapY)
      this.trees.push(tree)
    }
  }

  private bootstrap(X: number[][], y: number[]): {
    bootstrapX: number[][]
    bootstrapY: number[]
  } {
    const n = X.length
    const bootstrapX: number[][] = []
    const bootstrapY: number[] = []

    for (let i = 0; i < n; i++) {
      const randomIndex = Math.floor(Math.random() * n)
      bootstrapX.push(X[randomIndex])
      bootstrapY.push(y[randomIndex])
    }

    return { bootstrapX, bootstrapY }
  }

  predict(x: number[]): [number, number] {
    const predictions = this.trees.map(tree => tree.predict(x)[0])
    const mean = predictions.reduce((sum, val) => sum + val, 0) / predictions.length

    // Confidence based on consistency of predictions (inverse of coefficient of variation)
    const std = Math.sqrt(
      predictions.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / predictions.length
    )

    // Calculate coefficient of variation and convert to confidence
    const cv = Math.abs(mean) > 0.01 ? std / Math.abs(mean) : 1
    const confidence = Math.max(0.65, Math.min(0.90, 1 - cv))

    return [mean, confidence]
  }
}

/**
 * Exponential Smoothing Model
 */
export class ExponentialSmoothingModel {
  private alpha: number = 0.3 // Smoothing parameter
  private beta: number = 0.1 // Trend parameter
  private level: number = 0
  private trend: number = 0

  train(y: number[]): void {
    if (y.length < 2) return

    // Initialize
    this.level = y[0]
    this.trend = y[1] - y[0]

    // Update with data
    for (let i = 1; i < y.length; i++) {
      const prevLevel = this.level
      this.level = this.alpha * y[i] + (1 - this.alpha) * (this.level + this.trend)
      this.trend = this.beta * (this.level - prevLevel) + (1 - this.beta) * this.trend
    }
  }

  predict(steps: number = 1): [number, number] {
    let forecast = this.level
    for (let i = 0; i < steps; i++) {
      forecast += this.trend
    }

    const confidence = 0.6 // Exponential smoothing has moderate confidence
    return [forecast, confidence]
  }
}

/**
 * ARIMA-like model (Autoregressive Integrated Moving Average)
 */
export class ARIMAModel {
  private arCoeffs: number[] = []
  private maCoeffs: number[] = []
  private p: number = 5 // AR order
  private q: number = 5 // MA order

  train(y: number[]): void {
    // Difference the series to make it stationary
    const diff = this.difference(y)

    // Fit AR coefficients using least squares
    this.arCoeffs = this.fitAR(diff, this.p)

    // Calculate residuals and fit MA coefficients
    const residuals = this.calculateResiduals(diff, this.arCoeffs)
    this.maCoeffs = this.fitMA(residuals, this.q)
  }

  private difference(y: number[]): number[] {
    const diff: number[] = []
    for (let i = 1; i < y.length; i++) {
      diff.push(y[i] - y[i - 1])
    }
    return diff
  }

  private fitAR(y: number[], p: number): number[] {
    const n = y.length
    if (n < p + 1) return new Array(p).fill(0)

    // Build design matrix X and target vector Y
    const X: number[][] = []
    const Y: number[] = []

    for (let i = p; i < n; i++) {
      const row: number[] = []
      for (let j = 1; j <= p; j++) {
        row.push(y[i - j])
      }
      X.push(row)
      Y.push(y[i])
    }

    // Solve using normal equations: (X'X)^(-1)X'Y
    return this.leastSquares(X, Y)
  }

  private fitMA(residuals: number[], q: number): number[] {
    const n = residuals.length
    if (n < q + 1) return new Array(q).fill(0)

    const X: number[][] = []
    const Y: number[] = []

    for (let i = q; i < n; i++) {
      const row: number[] = []
      for (let j = 1; j <= q; j++) {
        row.push(residuals[i - j])
      }
      X.push(row)
      Y.push(residuals[i])
    }

    return this.leastSquares(X, Y)
  }

  private leastSquares(X: number[][], Y: number[]): number[] {
    // Simplified least squares (gradient descent)
    const numFeatures = X[0].length
    const coeffs = new Array(numFeatures).fill(0)
    const learningRate = 0.01
    const iterations = 100

    for (let iter = 0; iter < iterations; iter++) {
      const grads = new Array(numFeatures).fill(0)

      for (let i = 0; i < X.length; i++) {
        let prediction = 0
        for (let j = 0; j < numFeatures; j++) {
          prediction += coeffs[j] * X[i][j]
        }
        const error = prediction - Y[i]

        for (let j = 0; j < numFeatures; j++) {
          grads[j] += error * X[i][j]
        }
      }

      for (let j = 0; j < numFeatures; j++) {
        coeffs[j] -= (learningRate * grads[j]) / X.length
      }
    }

    return coeffs
  }

  private calculateResiduals(y: number[], arCoeffs: number[]): number[] {
    const residuals: number[] = []
    const p = arCoeffs.length

    for (let i = p; i < y.length; i++) {
      let prediction = 0
      for (let j = 0; j < p; j++) {
        prediction += arCoeffs[j] * y[i - j - 1]
      }
      residuals.push(y[i] - prediction)
    }

    return residuals
  }

  predict(y: number[], steps: number = 1): [number, number] {
    // Use last values and coefficients to predict
    let lastValues = y.slice(-this.p)

    for (let step = 0; step < steps; step++) {
      let prediction = 0
      for (let i = 0; i < Math.min(this.arCoeffs.length, lastValues.length); i++) {
        prediction += this.arCoeffs[i] * lastValues[lastValues.length - 1 - i]
      }
      lastValues.push(lastValues[lastValues.length - 1] + prediction)
      lastValues = lastValues.slice(-this.p)
    }

    const finalPrediction = lastValues[lastValues.length - 1]
    const confidence = 0.65

    return [finalPrediction, confidence]
  }
}

/**
 * Calculate model performance metrics
 */
export function calculatePerformance(
  yTrue: number[],
  yPred: number[]
): ModelPerformance {
  const n = yTrue.length

  // MAE
  const mae = yTrue.reduce((sum, val, i) => sum + Math.abs(val - yPred[i]), 0) / n

  // RMSE
  const mse = yTrue.reduce((sum, val, i) => sum + Math.pow(val - yPred[i], 2), 0) / n
  const rmse = Math.sqrt(mse)

  // MAPE
  const mape = yTrue.reduce((sum, val, i) => {
    return sum + Math.abs((val - yPred[i]) / val)
  }, 0) / n * 100

  // R-squared
  const yMean = yTrue.reduce((sum, val) => sum + val, 0) / n
  const ssRes = yTrue.reduce((sum, val, i) => sum + Math.pow(val - yPred[i], 2), 0)
  const ssTot = yTrue.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0)
  const r2 = 1 - (ssRes / ssTot)

  // Directional accuracy
  let correct = 0
  for (let i = 1; i < n; i++) {
    const actualDir = yTrue[i] > yTrue[i - 1]
    const predDir = yPred[i] > yTrue[i - 1]
    if (actualDir === predDir) correct++
  }
  const accuracy = (correct / (n - 1)) * 100

  return { mae, rmse, mape, r2, accuracy }
}
