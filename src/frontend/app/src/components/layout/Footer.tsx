import { Link } from 'react-router-dom';
import Logo from '../Logo';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-6">
            <Logo />
            <p className="mt-4 text-sm text-bone-mute max-w-sm leading-relaxed">
              Detection of AI-generated images and deepfake video, with the evidence shown.
            </p>
          </div>

          <nav aria-label="Product" className="md:col-span-3">
            <h2 className="text-sm font-medium text-bone">Product</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/analyze" className="text-bone-mute hover:text-bone transition-colors">Analyze an image</Link></li>
              <li><Link to="/analyze/video" className="text-bone-mute hover:text-bone transition-colors">Analyze a video</Link></li>
              <li><Link to="/dashboard" className="text-bone-mute hover:text-bone transition-colors">Dashboard</Link></li>
              <li><Link to="/history" className="text-bone-mute hover:text-bone transition-colors">History</Link></li>
            </ul>
          </nav>

          <nav aria-label="Project" className="md:col-span-3">
            <h2 className="text-sm font-medium text-bone">Project</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="https://github.com/Gosling-dude/DeepTrace" target="_blank" rel="noopener noreferrer" className="text-bone-mute hover:text-bone transition-colors">
                  Source on GitHub
                </a>
              </li>
              <li><a href="#" className="text-bone-mute hover:text-bone transition-colors">Privacy policy</a></li>
              <li><a href="#" className="text-bone-mute hover:text-bone transition-colors">Terms of service</a></li>
            </ul>
          </nav>
        </div>

        <p className="mt-12 pt-6 border-t border-line text-xs text-bone-mute">
          © {new Date().getFullYear()} DeepTrace. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
