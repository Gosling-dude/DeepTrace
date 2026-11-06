import { Link } from 'react-router-dom';
import { FileImage, Film } from 'lucide-react';

/** Toggle between the image and video analysis pages. */
export default function MediaTypeSwitch({ active }: { active: 'image' | 'video' }) {
  const base = 'seg-item';
  return (
    <div className="seg" role="tablist" aria-label="Media type">
      <Link
        to="/analyze"
        className={`${base} ${active === 'image' ? 'is-active' : ''}`}
      >
        <FileImage size={14} /> Image
      </Link>
      <Link
        to="/analyze/video"
        className={`${base} ${active === 'video' ? 'is-active' : ''}`}
      >
        <Film size={14} /> Video
      </Link>
    </div>
  );
}
