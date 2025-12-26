'use client';

type GoalAreaResult = {
  area: string;
  summary: string;
  confidence?: number;
  quotes?: string[];
};

type GoalResultsProps = {
  analysis: {
    areas: GoalAreaResult[];
    overallSummary?: string;
  };
};

export function GoalResults({ analysis }: GoalResultsProps) {
  if (!analysis) return null;

  return (
    <div className="w-full max-w-4xl mx-auto mt-12 space-y-10">

      {/* Overall Summary */}
      {analysis.overallSummary && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-blue-900 mb-2">
            Overall Summary
          </h2>
          <p className="text-gray-800 leading-relaxed">
            {analysis.overallSummary}
          </p>
        </div>
      )}

      {/* Per-area cards */}
      {analysis.areas?.map((area, idx) => (
        <div
          key={idx}
          className="bg-white border rounded-xl shadow-md p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">
              {area.area}
            </h3>

            {typeof area.confidence === 'number' && (
              <div className="text-sm font-medium text-gray-600">
                Confidence: {Math.round(area.confidence * 100)}%
              </div>
            )}
          </div>

          <p className="text-gray-700 leading-relaxed">
            {area.summary}
          </p>

          {area.quotes && area.quotes.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <p className="text-sm font-semibold text-gray-600 mb-2">
                Supporting quotes
              </p>
              <ul className="space-y-2">
                {area.quotes.map((q, i) => (
                  <li
                    key={i}
                    className="text-sm italic text-gray-700 bg-gray-50 p-3 rounded"
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
