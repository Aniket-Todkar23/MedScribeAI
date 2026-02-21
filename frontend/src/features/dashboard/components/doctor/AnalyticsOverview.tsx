import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Users, Calendar, Stethoscope } from "lucide-react";
import { useIsMobile, useIsTablet } from "../../../../hooks/useMediaQuery";
import { diabetesData, heartDiseaseData, asthmaData, ageDistributionData } from "./types";

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const total = payload[0].payload.total;
    const pct = total ? ((payload[0].value / total) * 100).toFixed(1) : '—';
    return (
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(8px)',
        padding: '10px 14px',
        borderRadius: '10px',
        border: `1.5px solid ${payload[0].payload.color}30`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        minWidth: '120px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            backgroundColor: payload[0].payload.color,
            boxShadow: `0 0 6px ${payload[0].payload.color}40`
          }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#0B3C3D' }}>
            {payload[0].name}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
          <span style={{ fontSize: '12px', color: '#64748B' }}>{payload[0].value} patients</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: payload[0].payload.color }}>{pct}%</span>
        </div>
      </div>
    );
  }
  return null;
};

const AnalyticsOverview = () => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  return (
    <section>
      <div style={{
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : 0,
        marginBottom: '20px'
      }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0B3C3D', margin: 0, letterSpacing: '-0.3px' }}>
            Patient Analytics
          </h2>
          <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0', fontWeight: 500 }}>Real-time overview of your practice</p>
        </div>
        
        {/* Date Filter & Actions */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          width: isMobile ? '100%' : 'auto',
          justifyContent: isMobile ? 'space-between' : 'flex-end'
        }}>
          <div style={{
            padding: '5px 12px', borderRadius: '20px',
            backgroundColor: 'rgba(31,159,163,0.06)',
            border: '1px solid rgba(31,159,163,0.12)',
            fontSize: '11px', color: '#1F9FA3', fontWeight: 600
          }}>
            Last 30 days
          </div>
        </div>
      </div>
      
      {/* ── Summary Metric Cards ── */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(3, 1fr)', 
        gap: '12px', 
        marginBottom: '16px' 
      }}>
        {[
          { label: 'Total Patients', value: '1,247', change: '+12%', icon: Users, accent: '#1F9FA3', bg: 'rgba(31,159,163,0.06)' },
          { label: 'Appointments', value: '24', change: '+15%', icon: Calendar, accent: '#6366F1', bg: 'rgba(99,102,241,0.06)' },
          { label: 'Consultations', value: '18', change: '+8%', icon: Stethoscope, accent: '#F59E0B', bg: 'rgba(245,158,11,0.06)' }
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.07 }}
            whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}
            style={{
              position: 'relative', overflow: 'hidden',
              padding: '14px 16px',
              borderRadius: '14px',
              backgroundColor: 'white',
              border: '1px solid rgba(0,0,0,0.04)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
              cursor: 'default',
              transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)'
            }}
          >
            {/* Top accent line */}
            <div style={{
              position: 'absolute', top: 0, left: '16px', right: '16px',
              height: '2px', borderRadius: '0 0 2px 2px',
              background: `linear-gradient(90deg, ${stat.accent}, ${stat.accent}60)`
            }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '9px',
                backgroundColor: stat.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <stat.icon size={16} color={stat.accent} strokeWidth={2.2} />
              </div>
              <span style={{
                fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.3px',
                padding: '2px 7px', borderRadius: '6px',
                backgroundColor: stat.change.startsWith('+') ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                color: stat.change.startsWith('+') ? '#16A34A' : '#DC2626'
              }}>
                {stat.change}
              </span>
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#0B3C3D', margin: 0, lineHeight: 1, letterSpacing: '-0.5px' }}>
              {stat.value}
            </h3>
            <p style={{ fontSize: '11px', color: '#94A3B8', margin: '4px 0 0', fontWeight: 500 }}>{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Chart Grid ── */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile || isTablet ? '1fr' : 'repeat(2, 1fr)', 
        gap: '12px' 
      }}>
        {[
          { title: 'Diabetes', data: diabetesData, badge: `${diabetesData[0].value} cases`, badgeColor: '#D64545', delay: 0 },
          { title: 'Heart Disease', data: heartDiseaseData, badge: `${heartDiseaseData[0].value} cases`, badgeColor: '#F5A524', delay: 0.07 },
          { title: 'Asthma', data: asthmaData, badge: `${asthmaData[0].value} cases`, badgeColor: '#1E9DF1', delay: 0.14 },
          { title: 'Age Groups', data: ageDistributionData, badge: '5 groups', badgeColor: '#1F9FA3', delay: 0.21 }
        ].map((chart) => (
          <motion.div
            key={chart.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 + chart.delay }}
            whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}
            style={{
              borderRadius: '14px',
              backgroundColor: 'white',
              border: '1px solid rgba(0,0,0,0.04)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)'
            }}
          >
            {/* Chart header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid rgba(0,0,0,0.03)'
            }}>
              <h4 style={{ fontSize: '13px', fontWeight: 650, color: '#0B3C3D', margin: 0, letterSpacing: '-0.1px' }}>
                {chart.title}
              </h4>
              <span style={{
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.3px',
                padding: '3px 8px', borderRadius: '6px',
                backgroundColor: `${chart.badgeColor}12`,
                color: chart.badgeColor
              }}>
                {chart.badge}
              </span>
            </div>
            {/* Chart body */}
            <div style={{ height: '195px', padding: '4px 8px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chart.data}
                    cx="50%"
                    cy="46%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={4}
                    dataKey="value"
                    animationBegin={chart.delay * 1000}
                    animationDuration={900}
                    stroke="none"
                  >
                    {chart.data.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={28}
                    iconType="circle"
                    iconSize={7}
                    formatter={(value: string, entry: any) => (
                      <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 500 }}>
                        {value} <span style={{ fontWeight: 700, color: '#334155' }}>({entry.payload.value})</span>
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default AnalyticsOverview;
