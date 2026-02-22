import { useState } from 'react';
// We will implement components in the next step
import UploadCard from './components/UploadCard';
import ResultCard from './components/ResultCard';

function App() {
    const [inferenceResult, setInferenceResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleUpload = async (file: File) => {
        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('explain', 'true');

        try {
            // Use environment variable for production API URL, fallback to localhost for dev
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const res = await fetch(`${API_URL}/api/v1/image/predict`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            setInferenceResult(data);
        } catch (error) {
            console.error("Failed to fetch prediction", error);
            alert("Error predicting image. Make sure backend is running on port 8000.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <header className="mb-10 text-center">
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">
                    DeepTrace
                </h1>
                <p className="mt-3 text-xl text-gray-400">
                    AI-Generated Image Detection with Explainability
                </p>
            </header>

            <main className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="space-y-6">
                    <UploadCard onUpload={handleUpload} loading={loading} />

                    <div className="p-6 bg-surface rounded-2xl border border-gray-700">
                        <h3 className="text-lg font-medium text-white mb-4">Sample Gallery</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {/* Mock gallery items */}
                            <div className="aspect-square bg-gray-800 rounded-lg flex items-center justify-center text-xs text-gray-500 cursor-pointer hover:bg-gray-700 hover:ring-2 hover:ring-primary transition-all">
                                Real Photo 1
                            </div>
                            <div className="aspect-square bg-gray-800 rounded-lg flex items-center justify-center text-xs text-gray-500 cursor-pointer hover:bg-gray-700 hover:ring-2 hover:ring-primary transition-all">
                                Midjourney V5
                            </div>
                            <div className="aspect-square bg-gray-800 rounded-lg flex items-center justify-center text-xs text-gray-500 cursor-pointer hover:bg-gray-700 hover:ring-2 hover:ring-primary transition-all">
                                GAN Face
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    {inferenceResult ? (
                        <ResultCard result={inferenceResult} />
                    ) : (
                        <div className="h-full min-h-[400px] flex items-center justify-center border-2 border-dashed border-gray-700 rounded-2xl bg-surface/50">
                            <p className="text-gray-500">Upload an image to see results</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default App;
