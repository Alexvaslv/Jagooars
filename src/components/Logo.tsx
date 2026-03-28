import React from 'react';
import { motion } from 'motion/react';
import { Aperture } from 'lucide-react';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const dimensions = {
    xs: { container: 'w-8 h-8', icon: 'w-3 h-3', text: 'text-sm', border: 'border-2', inset: 'inset-1' },
    sm: { container: 'w-10 h-10', icon: 'w-4 h-4', text: 'text-xl', border: 'border-2', inset: 'inset-1' },
    md: { container: 'w-20 h-20', icon: 'w-7 h-7', text: 'text-4xl', border: 'border-4', inset: 'inset-2' },
    lg: { container: 'w-32 h-32', icon: 'w-12 h-12', text: 'text-6xl', border: 'border-8', inset: 'inset-4' },
  };

  const d = dimensions[size];

  return (
    <div className="flex flex-col items-center">
      <div className={`relative flex items-center justify-center ${d.container} ${showText ? 'mb-3' : ''}`}>
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-0 rounded-full border-t-vk-accent border-r-vk-accent opacity-80 ${d.border}`}
          style={{ borderTopColor: 'var(--vk-accent)', borderRightColor: 'var(--vk-accent)' }}
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className={`absolute ${d.inset} rounded-full border-b-purple-500 border-l-purple-500 opacity-80 ${d.border}`}
          style={{ borderBottomColor: '#a855f7', borderLeftColor: '#a855f7' }}
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-[60%] h-[60%] bg-gradient-to-br from-vk-accent to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-12"
        >
          <Aperture className={`text-white ${d.icon} -rotate-12`} />
        </motion.div>
      </div>
      {showText && (
        <h1 className={`${d.text} font-black tracking-tight text-gray-900`}>
          RDIS <span className="text-transparent bg-clip-text bg-gradient-to-r from-vk-accent to-purple-600">Social</span>
        </h1>
      )}
    </div>
  );
};
