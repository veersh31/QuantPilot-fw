'use client'

import { AlertTriangle, Database, TrendingUp, FileText } from 'lucide-react'

export function DisclaimerFooter() {
  return (
    <footer className="w-full border-t border-border bg-background/95 backdrop-blur-sm mt-16">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6">
          {/* Main Disclaimer */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
            <AlertTriangle className="text-destructive flex-shrink-0 mt-1" size={18} />
            <div className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p className="font-semibold text-destructive text-sm">IMPORTANT LEGAL DISCLAIMER</p>
              <p>
                <strong className="text-foreground">NOT FINANCIAL ADVICE:</strong> QuantPilot and its AI advisor provide information for educational
                purposes only. Nothing on this platform constitutes financial, investment, trading, or other professional advice.
              </p>
              <p>
                <strong className="text-foreground">RISK WARNING:</strong> Trading stocks involves substantial risk of loss and is not suitable for all investors.
                You may lose some or all of your invested capital. Never invest money you cannot afford to lose.
              </p>
              <p>
                <strong className="text-foreground">NO GUARANTEES:</strong> Past performance, technical indicators, AI recommendations, and backtesting results
                do not guarantee future performance. Market conditions change and historical patterns may not repeat.
              </p>
              <p>
                <strong className="text-foreground">DATA ACCURACY:</strong> While we strive for accuracy, stock data, technical indicators, and AI analysis
                may contain errors or delays. Always verify information independently before making decisions.
              </p>
              <p>
                <strong className="text-foreground">YOUR RESPONSIBILITY:</strong> You are solely responsible for your investment decisions. Conduct your own
                research and consult with a licensed financial advisor before investing.
              </p>
            </div>
          </div>

          {/* Additional Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/40 border border-border hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Database className="text-primary" size={16} />
                <h4 className="font-semibold text-foreground text-sm">Data Sources</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Stock data provided by Yahoo Finance. Technical indicators calculated using industry-standard formulas.
                AI powered by Groq LLM. Data may be delayed or inaccurate.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/40 border border-border hover:border-blue-500/40 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="text-blue-500" size={16} />
                <h4 className="font-semibold text-foreground text-sm">Paper Trading</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Paper trading mode uses simulated money and does not reflect real market conditions including slippage,
                fees, or order execution challenges. Real trading results may differ significantly.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/40 border border-border hover:border-amber-500/40 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="text-amber-500" size={16} />
                <h4 className="font-semibold text-foreground text-sm">Tax Information</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tax reporting features are estimates only. Consult a licensed tax professional for accurate tax advice.
                We are not responsible for tax calculation errors.
              </p>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-4 border-t border-border/50 text-center">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} QuantPilot. For educational purposes only. Not financial advice.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
