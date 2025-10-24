import { motion } from "framer-motion";

export default function StatTile({
  icon,
  value,
  title,
  color = "from-blue-500 to-cyan-500",
  bg = "from-blue-50 to-cyan-50",
  delay = 0,
}: any) {
  const Icon = icon;
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay }}
      whileHover={{ y: -3 }}
      className={`bg-gradient-to-br ${bg} p-6 rounded-2xl border border-opacity-20 shadow-md`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`size-12 rounded-xl grid place-content-center bg-gradient-to-r ${color} text-white shadow`}>
          <Icon className="w-6 h-6" />
        </div>
        <span className="text-slate-400">↗</span>
      </div>
      <div className="text-3xl font-bold text-slate-800 mb-1">{value}</div>
      <div className="text-slate-600 font-medium">{title}</div>
    </motion.div>
  );
}
