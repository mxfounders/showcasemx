import { statuses,type SolutionStatus } from '@/lib/solutions/model';
import { brandColors } from '@/lib/brand-colors';
export function StatusBadge({status}:{status:SolutionStatus}){const tone=status==='published'?'sage':status==='changes_requested'?'amber':status==='rejected'?'terracotta':status==='pending'?'blue':'lavender';return <span style={{backgroundColor:brandColors[tone].soft,color:brandColors[tone].solid}} className="inline-flex rounded-full px-3 py-1 text-xs font-medium">{statuses[status].label}</span>;}
