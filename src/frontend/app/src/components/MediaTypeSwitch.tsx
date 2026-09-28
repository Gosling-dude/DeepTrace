import { Link } from 'react-router-dom';
import { FileImage, Film } from 'lucide-react';

/** Toggle between the image and video analysis pages. */
export default function MediaTypeSwitch({ active }: { active: 'image' | 'video' }) {
  const base = 'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors';
  return (
    <div className="inline-flex bg-gray-800/60 p-1 rounded-xl border border-white/5">
      <Link
        to="/analyze"
        className={`${base} ${active === 'image' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
      >
        <FileImage size={15} /> Image
      </Link>
      <Link
        to="/analyze/video"
        className={`${base} ${active === 'video' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
      >
        <Film size={15} /> Video
      </Link>
    </div>
  );
}
