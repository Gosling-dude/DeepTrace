import React, { useState } from 'react';

interface ResultProps {
    result: {
        is_ai_generated: boolean;
        confidence: number;
        model_version: string;
        scores: { cnn: number, freq: number, ensemble: number };
        explanation: {
            saliency_png_base64: string;
            frequency_map_png_base64: string;
        };
        inference_ms: number;
        warnings: string[];
    }
}

export default function ResultCard({ result }: ResultProps) {
    const [viewMode, setViewMode] = useState<'saliency' | 'frequency'>('saliency');

    const isAI = result.is_ai_generated;
    const perc = (result.confidence * 100).toFixed(1);
    const verdictColor = isAI ? 'text-danger' : 'text-success';
    const verdictBg = isAI ? 'bg-danger/10 border-danger/30' : 'bg-success/10 border-success/30';

    return (
        <div className={`rounded-2xl border p-6 shadow-2xl transition-all duration-500 ${verdictBg}`}>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-sm uppercase tracking-wider text-gray-400 font-semibold mb-1">Detection Result</h2>
                    <div className={`text-4xl font-extrabold ${verdictColor}`}>
                        {isAI ? 'AI Generated' : 'Genuine Image'}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold text-white">{perc}%</div>
                    <div className="text-xs text-gray-400">Confidence</div>
                </div>
            </div>

            {/* Explanation Visualizations */}
            <div className="bg-black/40 rounded-xl p-4 mb-6 border border-gray-700/50">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-medium text-gray-300">Visual Explanation</h3>
                    <div className="flex space-x-2 bg-gray-800 p-1 rounded-lg">
                        <button
                            className={`px-3 py-1 text-xs rounded-md transition ${viewMode === 'saliency' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => setViewMode('saliency')}
                        >
                            Spatial
                        </button>
                        <button
                            className={`px-3 py-1 text-xs rounded-md transition ${viewMode === 'frequency' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => setViewMode('frequency')}
                        >
                            Frequency
                        </button>
                    </div>
                </div>

                <div className="relative aspect-auto flex justify-center bg-gray-900 rounded-lg overflow-hidden min-h-[250px]">
                    {viewMode === 'saliency' ? (
                        <img
                            src={result.explanation.saliency_png_base64}
                            alt="Saliency Map"
                            className="max-h-[400px] object-contain"
                        />
                    ) : (
                        <img
                            src={result.explanation.frequency_map_png_base64}
                            alt="Frequency Map"
                            className="max-h-[400px] object-contain"
                        />
                    )}
                </div>

                <p className="text-xs text-center text-gray-400 mt-3 max-w-sm mx-auto">
                    {viewMode === 'saliency'
                        ? "Heatmap highlights spatial regions where the CNN detected synthetic texture patterns."
                        : "Frequency spectrum shows periodic artifacts (grid patterns) typical of GAN/Diffusion upsampling."}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-gray-700/50 pt-5 mt-2">
                <div>
                    <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Model Breakdown</h4>
                    <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Spatial CNN</span>
                            <span className="text-white">{(result.scores.cnn * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Frequency Net</span>
                            <span className="text-white">{(result.scores.freq * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
                <div>
                    <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Diagnostics</h4>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Latency</span>
                            <span className="text-white font-mono">{result.inference_ms}ms</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Version</span>
                            <span className="text-white">{result.model_version}</span>
                        </div>
                    </div>
                </div>
            </div>

            {result.warnings.length > 0 && (
                <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-start space-x-2">
                    <span className="text-warning">⚠️</span>
                    <span className="text-xs text-warning/90">{result.warnings.join(", ")}</span>
                </div>
            )}
        </div>
    );
}
