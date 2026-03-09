type PayrollReportGuideProps = {
  periodLabel: string;
  projectCount: number;
  awaitingExport: number;
  awaitingPayment: number;
};

export default function PayrollReportGuide({
  periodLabel,
  projectCount,
  awaitingExport,
  awaitingPayment,
}: PayrollReportGuideProps) {
  return (
    <div className="setuGuideCard">
      <div className="setuSectionEyebrow">Current reporting scope</div>

      <div className="setuGuideSteps">
        <div className="setuGuideStep">
          <span className="setuGuideStepNo">1</span>
          <div>
            <strong>Choose filters</strong>
            <div className="muted">Set period, scope, project, and contractor.</div>
          </div>
        </div>

        <div className="setuGuideStep">
          <span className="setuGuideStepNo">2</span>
          <div>
            <strong>Review totals</strong>
            <div className="muted">{projectCount} projects in view • {periodLabel}</div>
          </div>
        </div>

        <div className="setuGuideStep">
          <span className="setuGuideStepNo">3</span>
          <div>
            <strong>Take action</strong>
            <div className="muted">
              {awaitingExport} awaiting export • {awaitingPayment} awaiting payment
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
