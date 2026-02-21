import { motion } from "framer-motion";
import { Search, Phone, AlertCircle } from "lucide-react";

interface PatientSearchBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSearch: () => void;
  isSearching?: boolean;
  searchError?: string | null;
}

const PatientSearchBar = ({ searchQuery, setSearchQuery, onSearch, isSearching = false, searchError = null }: PatientSearchBarProps) => {
  return (
    <section>
      <motion.div 
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          borderRadius: '16px', padding: '6px',
          backgroundColor: 'white',
          border: '1.5px solid rgba(31,159,163,0.12)',
          boxShadow: '0 2px 12px rgba(31,159,163,0.06)',
          display: 'flex', alignItems: 'center', gap: '6px'
        }}
      >
        <div style={{ position: 'relative', flex: 1 }}>
          <Phone size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input 
            type="text" 
            placeholder="Search patient by phone number (e.g., +1234567890)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isSearching && onSearch()}
            disabled={isSearching}
            style={{
              paddingLeft: '42px', paddingRight: '14px',
              width: '100%', padding: '12px 14px 12px 42px',
              border: 'none', outline: 'none', backgroundColor: 'transparent',
              fontSize: '13.5px', color: '#0B3C3D', fontWeight: 500,
              fontFamily: 'inherit',
              opacity: isSearching ? 0.6 : 1
            }}
          />
        </div>
        {searchQuery && !isSearching && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              width: '32px', height: '32px', borderRadius: '8px',
              border: 'none', backgroundColor: 'rgba(239,68,68,0.06)',
              color: '#EF4444', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.12)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.06)'; }}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }}>×</span>
          </button>
        )}
        <button
          onClick={onSearch}
          disabled={isSearching}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '10px 20px', borderRadius: '12px',
            border: 'none',
            background: isSearching ? '#94A3B8' : 'linear-gradient(135deg, #1F9FA3, #17858A)',
            color: 'white', fontSize: '13px', fontWeight: 600,
            cursor: isSearching ? 'not-allowed' : 'pointer', 
            transition: 'all 0.2s ease',
            boxShadow: isSearching ? 'none' : '0 2px 8px rgba(31,159,163,0.3)',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => { 
            if (!isSearching) {
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(31,159,163,0.4)'; 
              e.currentTarget.style.transform = 'translateY(-1px)'; 
            }
          }}
          onMouseLeave={(e) => { 
            if (!isSearching) {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(31,159,163,0.3)'; 
              e.currentTarget.style.transform = 'translateY(0)'; 
            }
          }}
        >
          <Search size={15} /> Search
        </button>
      </motion.div>
      
      {/* Error Message */}
      {searchError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: '12px',
            padding: '12px 16px',
            backgroundColor: '#FEE2E2',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={18} color="#DC2626" />
          <span style={{ fontSize: '13px', color: '#DC2626', fontWeight: 500 }}>
            {searchError}
          </span>
        </motion.div>
      )}
      
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spin {
            animation: spin 1s linear infinite;
          }
        `}
      </style>
    </section>
  );
};

export default PatientSearchBar;
