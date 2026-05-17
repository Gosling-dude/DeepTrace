import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Eye, BarChart3, Lock, ArrowRight, Sparkles, Cpu, ChevronRight } from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

export default function Landing() {
  const features = [
    {
      icon: Cpu,
      title: 'Hybrid Deep Learning',
      description: 'Dual-stream architecture combining spatial CNN analysis with frequency domain detection for superior accuracy.',
      color: '#3b82f6',
    },
    {
      icon: Eye,
      title: 'Visual Explainability',
      description: 'Grad-CAM heatmaps and frequency spectrum analysis show exactly why an image was flagged.',
      color: '#8b5cf6',
    },
    {
      icon: Zap,
      title: 'Real-time Analysis',
      description: 'Get detection results in milliseconds with confidence scores and detailed model breakdowns.',
      color: '#06b6d4',
    },
    {
      icon: BarChart3,
      title: 'Analytics Dashboard',
      description: 'Track detection trends, confidence distributions, and platform usage with rich visualizations.',
      color: '#10b981',
    },
    {
      icon: Lock,
      title: 'Enterprise Security',
      description: 'JWT authentication, rate limiting, role-based access control, and comprehensive audit logging.',
      color: '#f59e0b',
    },
    {
      icon: Sparkles,
      title: 'Model Transparency',
      description: 'Full inference metadata, version tracking, and calibrated confidence scoring.',
      color: '#f43f5e',
    },
  ];

  const stats = [
    { value: '94%', label: 'Detection Accuracy' },
    { value: '<1s', label: 'Inference Time' },
    { value: '2', label: 'Analysis Streams' },
    { value: '24/7', label: 'Availability' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden grid-bg">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center pt-20">
          <motion.div {...fadeInUp}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8 border border-white/10" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-blue-300">AI Detection Platform — Now Live</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.1] mb-6"
          >
            <span className="text-white">Detect AI-Generated</span>
            <br />
            <span className="gradient-text">Images Instantly</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Advanced hybrid deep learning model that analyzes both spatial features 
            and frequency domain artifacts to expose synthetic images with visual explanations.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/signup" className="btn-primary flex items-center gap-2 text-base">
              Start Detecting <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn-secondary flex items-center gap-2 text-base">
              Sign In <ChevronRight size={18} />
            </Link>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto"
          >
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-bold gradient-text mb-1">{stat.value}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Powerful Detection <span className="gradient-text">Engine</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Built with cutting-edge deep learning research, DeepTrace offers comprehensive 
              image authenticity verification with full transparency.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="glass-card glass-card-hover p-6"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${feature.color}15`, border: `1px solid ${feature.color}25` }}
                >
                  <feature.icon size={20} style={{ color: feature.color }} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              How It <span className="gradient-text">Works</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Three simple steps to verify any image's authenticity.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Upload Image', desc: 'Drag and drop or select any image file. Supports JPEG, PNG, WebP, and more.' },
              { step: '02', title: 'AI Analysis', desc: 'Our hybrid model processes spatial textures and frequency artifacts simultaneously.' },
              { step: '03', title: 'Get Results', desc: 'Receive a verdict with confidence score, visual explanations, and model diagnostics.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="text-5xl font-black gradient-text mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-12 relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-10" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }} />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to Verify Image Authenticity?
              </h2>
              <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                Join DeepTrace and get instant access to state-of-the-art AI detection with full explainability.
              </p>
              <Link to="/signup" className="btn-primary inline-flex items-center gap-2 text-base">
                Create Free Account <ArrowRight size={18} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
