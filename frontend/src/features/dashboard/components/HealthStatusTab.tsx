import { motion } from "framer-motion";
import {
  Heart, Droplets, Pill, Clock, AlertTriangle,
  TrendingUp, Activity, Thermometer, Wind
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart
} from "recharts";
import { useIsMobile, useIsTablet } from "../../../hooks/useMediaQuery";

const kpiCards = [
  {
    label: "Blood Pressure",
    value: "120/80",
    unit: "mmHg",
    status: "Normal",
    icon: Heart,
    accent: "#1F9FA3",
    bg: "rgba(31,159,163,0.06)",
    badgeColor: "#1F9FA3",
    badgeBg: "rgba(31,159,163,0.08)",
    change: "+2%",
  },
  {
    label: "Blood Sugar",
    value: "180",
    unit: "mg/dL",
    status: "High",
    icon: Droplets,
    accent: "#D64545",
    bg: "rgba(214,69,69,0.06)",
    badgeColor: "#D64545",
    badgeBg: "rgba(214,69,69,0.08)",
    change: "+12%",
  },
  {
    label: "Medication Compliance",
    value: "90%",
    unit: "",
    status: "Good",
    icon: Pill,
    accent: "#6366F1",
    bg: "rgba(99,102,241,0.06)",
    badgeColor: "#16A34A",
    badgeBg: "rgba(34,197,94,0.08)",
    change: "+5%",
  },
  {
    label: "Next Visit",
    value: "3",
    unit: "Days",
    status: "Upcoming",
    icon: Clock,
    accent: "#F59E0B",
    bg: "rgba(245,158,11,0.06)",
    badgeColor: "#1E9DF1",
    badgeBg: "rgba(30,157,241,0.08)",
    change: "",
  },
] as const;

const vitals = [
  { icon: Activity, label: "Heart Rate", value: "72 bpm", color: "#D64545" },
  { icon: Thermometer, label: "Temperature", value: "98.4°F", color: "#F59E0B" },
  { icon: Wind, label: "SpO₂", value: "97%", color: "#1E9DF1" },
  { icon: TrendingUp, label: "BMI", value: "24.2", color: "#6366F1" },
];

const bpHistory = [
  { date: "Jan", systolic: 132, diastolic: 84 },
  { date: "Feb 1", systolic: 128, diastolic: 82 },
  { date: "Feb 7", systolic: 125, diastolic: 80 },
  { date: "Feb 14", systolic: 122, diastolic: 78 },
  { date: "Feb 21", systolic: 120, diastolic: 80 },
];

const sugarHistory = [
  { date: "Jan", value: 210 },
  { date: "Feb 1", value: 195 },
  { date: "Feb 7", value: 188 },
  { date: "Feb 14", value: 185 },
  { date: "Feb 21", value: 180 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(8px)",
          padding: "10px 14px",
          borderRadius: "10px",
          border: "1.5px solid rgba(31,159,163,0.15)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          minWidth: "110px",
        }}
      >
        <p style={{ fontSize: "11px", fontWeight: 600, color: "#0B3C3D", marginBottom: "4px" }}>
          {label}
        </p>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: p.color,
              }}
            />
            <span style={{ fontSize: "11px", color: "#64748B" }}>
              {p.name}: <strong style={{ color: "#334155" }}>{p.value}</strong>
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const HealthStatusTab = () => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  return (
  <section>
    {/* Header */}
    <div
      style={{
        display: "flex",
        alignItems: isMobile ? "flex-start" : "center",
        flexDirection: isMobile ? "column" : "row",
        justifyContent: "space-between",
        marginBottom: "20px",
        gap: isMobile ? "8px" : undefined,
      }}
    >
      <div>
        <h2
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "#0B3C3D",
            margin: 0,
            letterSpacing: "-0.3px",
          }}
        >
          Health Overview
        </h2>
        <p
          style={{
            fontSize: "12px",
            color: "#94A3B8",
            margin: "2px 0 0",
            fontWeight: 500,
          }}
        >
          Welcome back, Rahul Sharma
        </p>
      </div>
      <div
        style={{
          padding: "5px 12px",
          borderRadius: "20px",
          backgroundColor: "rgba(31,159,163,0.06)",
          border: "1px solid rgba(31,159,163,0.12)",
          fontSize: "11px",
          color: "#1F9FA3",
          fontWeight: 600,
        }}
      >
        Last updated: Today
      </div>
    </div>

    {/* KPI Cards */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
        gap: isMobile ? "8px" : "12px",
        marginBottom: "16px",
      }}
    >
      {kpiCards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.07 }}
          whileHover={{ y: -3, boxShadow: "0 8px 24px rgba(0,0,0,0.06)" }}
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "14px 16px",
            borderRadius: "14px",
            backgroundColor: "white",
            border: "1px solid rgba(0,0,0,0.04)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
            cursor: "default",
            transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {/* Top accent line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "16px",
              right: "16px",
              height: "2px",
              borderRadius: "0 0 2px 2px",
              background: `linear-gradient(90deg, ${card.accent}, ${card.accent}60)`,
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "9px",
                backgroundColor: card.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <card.icon size={16} color={card.accent} strokeWidth={2.2} />
            </div>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.3px",
                padding: "3px 8px",
                borderRadius: "6px",
                backgroundColor: card.badgeBg,
                color: card.badgeColor,
              }}
            >
              {card.status}
            </span>
          </div>
          <h3
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "#0B3C3D",
              margin: 0,
              lineHeight: 1,
              letterSpacing: "-0.5px",
            }}
          >
            {card.value}
            {card.unit && (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "#94A3B8",
                  marginLeft: "4px",
                }}
              >
                {card.unit}
              </span>
            )}
          </h3>
          <p style={{ fontSize: "11px", color: "#94A3B8", margin: "4px 0 0", fontWeight: 500 }}>
            {card.label}
          </p>
          {card.change && (
            <span
              style={{
                position: "absolute",
                bottom: "12px",
                right: "14px",
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: "5px",
                backgroundColor: card.change.startsWith("+") && card.accent === "#D64545"
                  ? "rgba(214,69,69,0.08)"
                  : "rgba(34,197,94,0.08)",
                color: card.change.startsWith("+") && card.accent === "#D64545"
                  ? "#D64545"
                  : "#16A34A",
              }}
            >
              {card.change}
            </span>
          )}
        </motion.div>
      ))}
    </div>

    {/* Alert */}
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      style={{
        display: "flex",
        gap: "12px",
        alignItems: "flex-start",
        padding: "14px 16px",
        borderRadius: "12px",
        backgroundColor: "rgba(245,165,36,0.06)",
        border: "1px solid rgba(245,165,36,0.15)",
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "8px",
          backgroundColor: "rgba(245,165,36,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <AlertTriangle size={14} color="#F59E0B" />
      </div>
      <div>
        <p style={{ fontSize: "13px", fontWeight: 650, color: "#92600e", margin: 0, lineHeight: 1.3 }}>
          Blood Sugar Alert
        </p>
        <p
          style={{
            fontSize: "12px",
            color: "#A07114",
            margin: "4px 0 0",
            lineHeight: 1.5,
          }}
        >
          Your blood sugar is above the recommended range (180 mg/dL). Please consult your doctor and
          maintain dietary guidelines.
        </p>
      </div>
    </motion.div>

    {/* Vitals Overview */}
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
        gap: isMobile ? "8px" : "10px",
        marginBottom: "16px",
      }}
    >
      {vitals.map((v) => (
        <div
          key={v.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 14px",
            borderRadius: "12px",
            backgroundColor: "white",
            border: "1px solid rgba(0,0,0,0.04)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              backgroundColor: `${v.color}12`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <v.icon size={14} color={v.color} strokeWidth={2.2} />
          </div>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#0B3C3D", margin: 0, lineHeight: 1 }}>
              {v.value}
            </p>
            <p style={{ fontSize: "10px", color: "#94A3B8", margin: "2px 0 0", fontWeight: 500 }}>
              {v.label}
            </p>
          </div>
        </div>
      ))}
    </motion.div>

    {/* Charts row */}
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px" }}>
      {/* BP History Chart */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.06)" }}
        style={{
          borderRadius: "14px",
          backgroundColor: "white",
          border: "1px solid rgba(0,0,0,0.04)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
          overflow: "hidden",
          transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid rgba(0,0,0,0.03)",
          }}
        >
          <h4 style={{ fontSize: "13px", fontWeight: 650, color: "#0B3C3D", margin: 0 }}>
            Blood Pressure Trend
          </h4>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.3px",
              padding: "3px 8px",
              borderRadius: "6px",
              backgroundColor: "rgba(31,159,163,0.08)",
              color: "#1F9FA3",
            }}
          >
            Improving
          </span>
        </div>
        <div style={{ height: "200px", padding: "8px 12px 12px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bpHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} domain={[60, 150]} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="systolic"
                name="Systolic"
                stroke="#D64545"
                strokeWidth={2}
                dot={{ r: 3, fill: "#D64545" }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="diastolic"
                name="Diastolic"
                stroke="#1F9FA3"
                strokeWidth={2}
                dot={{ r: 3, fill: "#1F9FA3" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Sugar History Chart */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.47 }}
        whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.06)" }}
        style={{
          borderRadius: "14px",
          backgroundColor: "white",
          border: "1px solid rgba(0,0,0,0.04)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
          overflow: "hidden",
          transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid rgba(0,0,0,0.03)",
          }}
        >
          <h4 style={{ fontSize: "13px", fontWeight: 650, color: "#0B3C3D", margin: 0 }}>
            Blood Sugar Trend
          </h4>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.3px",
              padding: "3px 8px",
              borderRadius: "6px",
              backgroundColor: "rgba(245,165,36,0.08)",
              color: "#F59E0B",
            }}
          >
            Elevated
          </span>
        </div>
        <div style={{ height: "200px", padding: "8px 12px 12px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sugarHistory}>
              <defs>
                <linearGradient id="sugarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} domain={[100, 250]} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                name="Sugar"
                stroke="#F59E0B"
                strokeWidth={2}
                fill="url(#sugarGrad)"
                dot={{ r: 3, fill: "#F59E0B" }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  </section>
  );
};

export default HealthStatusTab;
