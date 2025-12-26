'use client';

export type GoalAreaResult = {
  area: string;
  summary: string;
  confidence?: number; // 0..1
  quotes?: string[];
};

export type GoalAnalysis = {
  areas: GoalAreaResult[];
  overallSummary?: string;
};

type GoalResultsProps = {
  analysis: GoalAnalysis;
};

export function GoalResults({ analysis }: GoalResultsProps) {
  if (!analysis) return null;

  return (
    <div className="w-full max-w-4xl mx-auto mt-6 space-y-8">
      {/* Overall Summary */}
      {analysis.overallSummary && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-blue-900 mb-2">Overall Summary</h2>
          <p className="text-gray-800 leading-relaxed">{analysis.overallSummary}</p>
        </div>
      )}

      {/* Per-area cards */}
      {analysis.areas?.map((area, idx) => (
        <div key={idx} className="bg-white border rounded-2xl shadow-md p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-xl font-semibold text-gray-900">{area.area}</h3>

            {typeof area.confidence === 'number' && (
              <div className="text-sm font-medium text-gray-600 whitespace-nowrap">
                Confidence: {Math.round(area.confidence * 100)}%
              </div>
            )}
          </div>

          <p className="text-gray-700 leading-relaxed">{area.summary}</p>

          {area.quotes && area.quotes.length > 0 && (
            <div className="mt-2 border-t pt-4">
              <p className="text-sm font-semibold text-gray-600 mb-2">Supporting quotes</p>
              <ul className="space-y-2">
                {area.quotes.map((q, i) => (
                  <li
                    key={i}
                    className="text-sm italic text-gray-700 bg-gray-50 p-3 rounded-xl border"
                  >
                    “{q}”
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
