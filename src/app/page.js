'use client';
import { useState, useEffect } from 'react';
import { Filter, Calendar, Users, Target } from 'lucide-react';

export default function ViewerDashboard() {
  const [masterclasses, setMasterclasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [misData, setMisData] = useState([]);
  const [agentContribData, setAgentContribData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Used for the "Target Date" column (typically the newest date in the dataset)
  const [targetDateStr, setTargetDateStr] = useState('');

  useEffect(() => {
    async function loadInitial() {
      try {
        const clsRes = await fetch('/api/masterclass');
        const clsData = await clsRes.json();
        setMasterclasses(clsData);
        if (clsData.length > 0) setSelectedClassId(clsData[0]._id);
      } catch(e) { console.error(e) }
    }
    loadInitial();
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;
    
    async function fetchDashboard() {
      setIsLoading(true);
      try {
        const misRes = await fetch(`/api/mis?masterclass=${selectedClassId}`);
        const data = await misRes.json();
        setMisData(data);
        
        if (data.length > 0) {
          const newest = new Date(Math.max(...data.map(e => new Date(e.date))));
          setTargetDateStr(newest.toISOString().split('T')[0]);
        }

        const contribRes = await fetch(`/api/agent-contribution?masterclass=${selectedClassId}`);
        const cData = await contribRes.json();
        setAgentContribData(cData);

      } catch (e) { console.error(e) }
      setIsLoading(false);
    }
    fetchDashboard();
  }, [selectedClassId]);

  // Helper to parse "HH:MM:SS" into seconds
  const parseTime = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
    return 0;
  };

  const formatTime = (totalSeconds) => {
    if (!totalSeconds || isNaN(totalSeconds)) return '';
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getDayDiff = (d1, d2) => {
    const timeDiff = new Date(d1).getTime() - new Date(d2).getTime();
    return Math.floor(timeDiff / (1000 * 3600 * 24));
  };

  const formatNum = (num, isCurrency=false) => {
    if (num === null || isNaN(num) || num === undefined) return '';
    const val = Number(num);
    const displayNum = val % 1 === 0 ? val : Number(val.toFixed(1));
    return isCurrency ? displayNum.toLocaleString() : displayNum;
  };
  
  const formatPct = (num, den) => {
    if (!den || den === 0) return '';
    return Math.round((num / den) * 100) + '%';
  };

  let columns = [];
  
  if (misData.length > 0 && targetDateStr) {
    const tDateObj = new Date(targetDateStr);
    const tDateStrLocal = tDateObj.toLocaleDateString('en-US');

    const getMonthName = (monthIdx) => {
      const monthNames = ["Jan", "Feb", "Mar", "April", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];
      return monthNames[monthIdx];
    };

    const filters = [
      { name: tDateStrLocal, isAvg: false, filterFunc: d => d.date.startsWith(targetDateStr) },
      { name: 'Last 7 days', isAvg: true, filterFunc: d => {
          const diff = getDayDiff(tDateObj, d.date);
          return diff >= 0 && diff < 7;
      }}
    ];

    const monthsSet = new Set();
    misData.forEach(d => {
      const dateObj = new Date(d.date);
      monthsSet.add(`${dateObj.getFullYear()}-${dateObj.getMonth()}`);
    });
    
    const sortedMonths = Array.from(monthsSet).sort((a,b) => {
      const [yA, mA] = a.split('-').map(Number);
      const [yB, mB] = b.split('-').map(Number);
      if (yA !== yB) return yB - yA;
      return mB - mA;
    });

    sortedMonths.forEach(mKey => {
      const [y, m] = mKey.split('-').map(Number);
      filters.push({
        name: getMonthName(m),
        isAvg: true,
        filterFunc: d => {
          const dateObj = new Date(d.date);
          return dateObj.getFullYear() === y && dateObj.getMonth() === m;
        }
      });
    });

    columns = filters.map(col => {
      const records = misData.filter(col.filterFunc);
      const uniqueDates = new Set(records.map(r => r.date.split('T')[0])).size;

      const sumAgentsAvailable = records.reduce((acc, r) => acc + (r.agentsAvailable || 0), 0);
      const sumLeadPushed = records.reduce((acc, r) => acc + (r.leadPushed || 0), 0);
      const sumDialed = records.reduce((acc, r) => acc + (r.dialed || 0), 0);
      const sumReachable = records.reduce((acc, r) => acc + (r.reachable || 0), 0);
      const sumTotalEngaged = records.reduce((acc, r) => acc + (r.totalEngaged || 0), 0);
      const sumInterested = records.reduce((acc, r) => acc + (r.interested || 0), 0);
      const sumUsersConverted = records.reduce((acc, r) => acc + (r.usersConverted || 0), 0);
      const sumRevenue = records.reduce((acc, r) => acc + (r.revenue || 0), 0);
      const sumTalkTimeSec = records.reduce((acc, r) => acc + parseTime(r.agentTalkTimeDuration), 0);

      const divisor = col.isAvg && uniqueDates > 0 ? uniqueDates : 1;
      const workingDays = uniqueDates;

      const agentsAvailable = uniqueDates > 0 ? sumAgentsAvailable / uniqueDates : 0; 
      const leadPushed = sumLeadPushed / divisor;
      const dialed = sumDialed / divisor;
      const reachable = sumReachable / divisor;
      const totalEngaged = sumTotalEngaged / divisor;
      const interested = sumInterested / divisor;
      const usersConverted = sumUsersConverted / divisor;
      const revenue = sumRevenue / divisor;
      const talkTimeSec = Math.round(sumTalkTimeSec / divisor);

      const avgAgentDivisor = col.isAvg ? agentsAvailable : sumAgentsAvailable; 
      const perAgentTalkTimeSec = avgAgentDivisor > 0 ? Math.round(talkTimeSec / avgAgentDivisor) : 0;
      const perAgentDialed = avgAgentDivisor > 0 ? dialed / avgAgentDivisor : 0;
      const perAgentReachable = avgAgentDivisor > 0 ? reachable / avgAgentDivisor : 0;
      const perAgentEngaged = avgAgentDivisor > 0 ? totalEngaged / avgAgentDivisor : 0;
      const perAgentInterested = avgAgentDivisor > 0 ? interested / avgAgentDivisor : 0;
      const perAgentConverted = avgAgentDivisor > 0 ? usersConverted / avgAgentDivisor : 0;
      const perAgentRevenue = avgAgentDivisor > 0 ? revenue / avgAgentDivisor : 0;

      return {
        name: col.name,
        isAvg: col.isAvg,
        workingDays: uniqueDates,
        agentsAvailable,
        leadPushed,
        dialed,
        reachable,
        totalEngaged,
        interested,
        usersConverted,
        revenue,
        talkTimeStr: formatTime(talkTimeSec),
        perAgentTalkTimeStr: formatTime(perAgentTalkTimeSec),
        perAgentDialed,
        perAgentReachable,
        perAgentEngaged,
        perAgentInterested,
        perAgentConverted,
        perAgentRevenue
      };
    });
  }

  const rows = [
    { label: 'Agents available', key: 'agentsAvailable' },
    { label: 'Working Days', key: 'workingDays', hideForSingleDay: true },
    { label: 'Agent Talk Time Duration', key: 'talkTimeStr', isString: true },
    { label: 'Lead Pushed', key: 'leadPushed' },
    { label: 'Dialed', key: 'dialed' },
    { label: 'Reachable', key: 'reachable' },
    { label: 'Total Engaged', key: 'totalEngaged' },
    { label: 'Interested', key: 'interested' },
    { label: 'Users Converted', key: 'usersConverted', highlight: true },
    { label: 'Revenue', key: 'revenue', highlight: true, isCurrency: true },
    { label: 'divider', type: 'divider' },
    { label: 'Reachable / Dialed', type: 'ratio', numKey: 'reachable', denKey: 'dialed' },
    { label: 'Engaged / Reachable', type: 'ratio', numKey: 'totalEngaged', denKey: 'reachable' },
    { label: 'Interested / Reachable', type: 'ratio', numKey: 'interested', denKey: 'reachable' },
    { label: 'Interested / Engaged', type: 'ratio', numKey: 'interested', denKey: 'totalEngaged' }, 
    { label: 'Converted / Interested', type: 'ratio', numKey: 'usersConverted', denKey: 'interested' },
    { label: 'Metrices per Agent per day', type: 'header' },
    { label: 'Per Agent Talk Time Duration', key: 'perAgentTalkTimeStr', isString: true },
    { label: 'Dialed', key: 'perAgentDialed' },
    { label: 'Reachable', key: 'perAgentReachable' },
    { label: 'Total Engaged', key: 'perAgentEngaged' },
    { label: 'Interested', key: 'perAgentInterested' },
    { label: 'Users Converted', key: 'perAgentConverted' },
    { label: 'Revenue', key: 'perAgentRevenue', isCurrency: true },
  ];

  // Process Agent Contribution Logic
  const totalContribRevenue = agentContribData.reduce((acc, c) => acc + (c.revenue || 0), 0);
  const totalContribConverted = agentContribData.reduce((acc, c) => acc + (c.usersConverted || 0), 0);
  
  // Aggregate per agent
  const agentBreakdown = [];
  const agentMap = new Map();

  agentContribData.forEach(c => {
    if (!c.agent) return;
    const agentId = c.agent._id;
    if (!agentMap.has(agentId)) {
      agentMap.set(agentId, { name: c.agent.name, revenue: 0, converted: 0 });
    }
    const current = agentMap.get(agentId);
    current.revenue += (c.revenue || 0);
    current.converted += (c.usersConverted || 0);
  });

  agentMap.forEach((val) => {
    agentBreakdown.push({
      name: val.name,
      revenue: val.revenue,
      converted: val.converted,
      percentage: totalContribRevenue > 0 ? ((val.revenue / totalContribRevenue) * 100).toFixed(1) : 0
    });
  });

  agentBreakdown.sort((a,b) => b.revenue - a.revenue);

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', background: 'linear-gradient(90deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Executive MIS Report
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '5px' }}>Daily average and aggregate performance tracking</p>
        </div>

        <div style={{ display: 'flex', gap: '15px' }}>
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px' }}>
            <Calendar size={18} className="text-primary"/>
            <input 
              type="date" 
              value={targetDateStr}
              onChange={(e) => setTargetDateStr(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '1rem', cursor: 'pointer' }}
            />
          </div>
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', minWidth: '250px' }}>
            <Filter size={18} className="text-primary"/>
            <select 
              value={selectedClassId} 
              onChange={(e) => setSelectedClassId(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '1rem', cursor: 'pointer' }}
            >
              {masterclasses.map(c => <option key={c._id} value={c._id} style={{ color: 'black' }}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>Analyzing databases...</div>
      ) : (
        <>
          <div className="glass-card" style={{ padding: '0', overflowX: 'auto', border: '1px solid var(--card-border)', marginBottom: '40px' }}>
            {columns.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>No MIS records found for this masterclass. Log some data in the Admin Panel to view the report.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.95rem' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '15px', background: 'rgba(217, 119, 6, 0.6)', color: 'white', borderRight: '2px solid rgba(255,255,255,0.1)', borderBottom: '2px solid rgba(255,255,255,0.1)', textAlign: 'left', minWidth: '250px' }}>
                      Daily Average
                    </th>
                    {columns.map((col, idx) => (
                      <th key={idx} style={{ padding: '15px', background: 'rgba(217, 119, 6, 0.4)', color: 'white', borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rIdx) => {
                    if (row.type === 'divider') return <tr key={rIdx}><td colSpan={columns.length + 1} style={{ background: 'rgba(255,255,255,0.05)', height: '10px' }}></td></tr>;
                    if (row.type === 'header') return <tr key={rIdx}><td colSpan={columns.length + 1} style={{ padding: '10px 15px', background: 'rgba(217, 119, 6, 0.4)', color: 'white', fontWeight: 600, textAlign: 'left', borderTop: '2px solid rgba(255,255,255,0.1)', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>{row.label}</td></tr>;
                    const trStyle = { borderBottom: '1px solid rgba(255,255,255,0.05)', background: row.highlight ? 'rgba(255,255,255,0.02)' : 'transparent', fontWeight: row.highlight ? 600 : 400 };

                    return (
                      <tr key={rIdx} style={trStyle}>
                        <td style={{ padding: '10px 15px', borderRight: '2px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>{row.label}</td>
                        {columns.map((col, cIdx) => {
                          let value = '';
                          if (row.hideForSingleDay && !col.isAvg) value = '';
                          else if (row.type === 'ratio') value = formatPct(col[row.numKey], col[row.denKey]);
                          else if (row.isString) value = col[row.key];
                          else value = formatNum(col[row.key], row.isCurrency);
                          return <td key={cIdx} style={{ padding: '10px 15px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>{value}</td>;
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Agent Contribution Tier List */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <Target className="text-primary" style={{ color: '#10b981' }} size={24} />
            <h2 style={{ fontSize: '1.4rem' }}>Agent Contribution Breakdown</h2>
          </div>
          
          <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            {agentBreakdown.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No agent contributions recorded for this masterclass yet.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                    <th style={{ padding: '15px' }}>Rank</th>
                    <th style={{ padding: '15px' }}>Agent Name</th>
                    <th style={{ padding: '15px' }}>Users Converted</th>
                    <th style={{ padding: '15px' }}>Total Revenue</th>
                    <th style={{ padding: '15px' }}>Contribution %</th>
                  </tr>
                </thead>
                <tbody>
                  {agentBreakdown.map((agent, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: index === 0 ? 'rgba(255, 215, 0, 0.03)' : 'transparent' }}>
                      <td style={{ padding: '15px', fontWeight: index === 0 ? '700' : '400', color: index === 0 ? '#fbbf24' : 'inherit' }}>
                         #{index + 1} {index === 0 && '👑'}
                      </td>
                      <td style={{ padding: '15px', fontWeight: 500 }}>{agent.name}</td>
                      <td style={{ padding: '15px', color: '#10b981' }}>{agent.converted}</td>
                      <td style={{ padding: '15px', fontWeight: 600 }}>₹{agent.revenue.toLocaleString()}</td>
                      <td style={{ padding: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ minWidth: '45px' }}>{agent.percentage}%</span>
                          <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${agent.percentage}%`, background: '#10b981', height: '100%' }}></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: 'rgba(255,255,255,0.02)', fontWeight: 'bold' }}>
                    <td colSpan={2} style={{ padding: '15px', textAlign: 'right' }}>Grand Total:</td>
                    <td style={{ padding: '15px', color: '#10b981' }}>{totalContribConverted}</td>
                    <td style={{ padding: '15px' }}>₹{totalContribRevenue.toLocaleString()}</td>
                    <td style={{ padding: '15px' }}>100%</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
