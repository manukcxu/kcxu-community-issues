import { motion } from 'framer-motion';

const LOGO_URL = 'https://media.base44.com/images/public/6a47d74833e614b0c8920a23/b0121762f_KCXU3D.png';

export default function Logo({ size = 40 }) {
  return (
    <motion.img
      src={LOGO_URL}
      alt="KCXU 92.7 FM"
      style={{ width: size, height: size }}
      className="rounded-full object-cover"
      initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
      animate={{
        opacity: 1,
        scale: [1, 1.06, 1],
        rotate: 0,
        y: [0, -2, 0]
      }}
      transition={{
        opacity: { duration: 0.6 },
        rotate: { duration: 0.6 },
        scale: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
        y: { duration: 3, repeat: Infinity, ease: 'easeInOut' }
      }}
      whileHover={{ scale: 1.15, rotate: 5 }}
    />
  );
}