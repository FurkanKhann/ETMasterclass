'use client';
import { useState, useEffect } from 'react';
import { Users, BookOpen, Database, Plus, BarChart2, DollarSign } from 'lucide-react';

export default function AdminDashboard() {
  const [masterclasses, setMasterclasses] = useState([]);
  const [agents, setAgents] = useState([]);
  
  // Forms
  const [newClass, setNewClass] = useState('');
  const [newAgent, setNewAgent] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  // Daily MIS Form
  const [misClass, setMisClass] = useState('');
  const [misDate, setMisDate] = useState(new Date().toISOString().split('T')[0]);
  const [misFormData, setMisFormData] = useState({
    agentsAvailable: '', leadPushed: '', dialed: '', reachable: '', totalEngaged: '', 
    interested: '', usersConverted: '', revenue: '', agentTalkTimeDuration: ''
  });

  // Agent Contribution Form
  const [contribClass, setContribClass] = useState('');
  const [contribAgent, setContribAgent] = useState('');
  const [contribDate, setContribDate] = useState(new Date().toISOString().split('T')[0]);
  const [contribFormData, setContribFormData] = useState({
    usersConverted: '', revenue: ''
  });

  // Toast
  const [msg, setMsg] = useState('');

  const fetchData = async () => {
    try {
      const clsRes = await fetch('/api/masterclass');
      const clsData = await clsRes.json();
      setMasterclasses(clsData);

      const agRes = await fetch('/api/agent');
      const agData = await agRes.json();
      setAgents(agData);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showMsg = (message) => {
    setMsg(message);
    setTimeout(() => setMsg(''), 4000);
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/masterclass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClass })
    });
    if (res.ok) { setNewClass(''); showMsg('Masterclass added!'); fetchData(); }
  };

  const handleAddAgent = async (e) => {
    e.preventDefault();
    if (!selectedClass) { showMsg('Please select a masterclass'); return; }
    
    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newAgent, masterclassId: selectedClass })
    });
    if (res.ok) { setNewAgent(''); showMsg('Agent added!'); fetchData(); }
  };

  const handleSubmitMIS = async (e) => {
    e.preventDefault();
    if (!misClass || !misDate) { showMsg('Please select class and date for MIS'); return; }

    const payload = {
      date: misDate,
      masterclass: misClass,
      agentsAvailable: Number(misFormData.agentsAvailable) || 0,
      leadPushed: Number(misFormData.leadPushed) || 0,
      dialed: Number(misFormData.dialed) || 0,
      reachable: Number(misFormData.reachable) || 0,
      totalEngaged: Number(misFormData.totalEngaged) || 0,
      interested: Number(misFormData.interested) || 0,
      usersConverted: Number(misFormData.usersConverted) || 0,
      revenue: Number(misFormData.revenue) || 0,
      agentTalkTimeDuration: misFormData.agentTalkTimeDuration || '00:00:00'
    };

    const res = await fetch('/api/mis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showMsg('Overall Daily MIS recorded successfully!');
      setMisFormData({ agentsAvailable: '', leadPushed: '', dialed: '', reachable: '', totalEngaged: '', interested: '', usersConverted: '', revenue: '', agentTalkTimeDuration: '' });
    } else {
      showMsg('Failed to record MIS.');
    }
  };

  const handleSubmitContrib = async (e) => {
    e.preventDefault();
    if (!contribClass || !contribAgent || !contribDate) { showMsg('Please select class, agent, and date'); return; }

    const payload = {
      date: contribDate,
      masterclass: contribClass,
      agent: contribAgent,
      usersConverted: Number(contribFormData.usersConverted) || 0,
      revenue: Number(contribFormData.revenue) || 0,
    };

    const res = await fetch('/api/agent-contribution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showMsg('Agent Contribution recorded successfully!');
      setContribFormData({ usersConverted: '', revenue: '' });
    } else {
      showMsg('Failed to record contribution.');
    }
  };

  const contribAgentsAvailable = agents.filter(a => a.masterclasses.some(mc => mc._id === contribClass || mc === contribClass));

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
        <Database size={32} style={{ color: '#3b82f6' }} />
        <h1>Admin Control Panel</h1>
      </div>

      {msg && (
        <div style={{ padding: '15px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', marginBottom: '20px' }}>
          {msg}
        </div>
      )}

      {/* Admin Quick Setup Grid */}
      <div className="grid">
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <BookOpen className="text-primary" />
            <h3 style={{ margin: 0 }}>Create Masterclass</h3>
          </div>
          <form onSubmit={handleAddClass} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="text" className="input-field" placeholder="e.g. AI Blueprint" value={newClass} onChange={(e) => setNewClass(e.target.value)} required />
            <button type="submit" className="btn-primary"><Plus size={18} /> Add</button>
          </form>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Users className="text-primary" />
            <h3 style={{ margin: 0 }}>Register Agent</h3>
          </div>
          <form onSubmit={handleAddAgent} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <select className="input-field" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} required>
              <option value="">Select Target Masterclass</option>
              {masterclasses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            <input type="text" className="input-field" placeholder="Agent Name (e.g. Kajol)" value={newAgent} onChange={(e) => setNewAgent(e.target.value)} required />
            <button type="submit" className="btn-primary"><Plus size={18} /> Add</button>
          </form>
        </div>
      </div>

      <div className="grid" style={{ marginTop: '20px' }}>
        {/* Overall MIS Form */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <BarChart2 className="text-primary" style={{ color: '#8b5cf6' }} />
            <h3 style={{ margin: 0 }}>1. Log Masterclass MIS (Daily)</h3>
          </div>
          <form onSubmit={handleSubmitMIS}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
              <div><label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Date</label><input type="date" className="input-field" value={misDate} onChange={(e)=>setMisDate(e.target.value)} required /></div>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Masterclass</label>
                <select className="input-field" value={misClass} onChange={(e) => setMisClass(e.target.value)} required>
                  <option value="">Select Masterclass...</option>
                  {masterclasses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              {[
                { id: 'agentsAvailable', label: 'Agents Avail.' },
                { id: 'leadPushed', label: 'Leads' },
                { id: 'dialed', label: 'Dialed' },
                { id: 'reachable', label: 'Reachable' },
                { id: 'totalEngaged', label: 'Engaged' },
                { id: 'interested', label: 'Interested' },
                { id: 'usersConverted', label: 'Converted' },
                { id: 'revenue', label: 'Revenue (₹)' },
              ].map(field => (
                <div key={field.id}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{field.label}</label>
                  <input type="number" className="input-field" value={misFormData[field.id]} onChange={(e) => setMisFormData({...misFormData, [field.id]: e.target.value})} placeholder="0" />
                </div>
              ))}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Talk Time (HH:MM:SS)</label>
                <input type="text" className="input-field" value={misFormData.agentTalkTimeDuration} onChange={(e) => setMisFormData({...misFormData, agentTalkTimeDuration: e.target.value})} placeholder="02:30:00" />
              </div>
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '15px' }}>Submit Core MIS</button>
          </form>
        </div>

        {/* Agent Contribution Form */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <DollarSign className="text-primary" style={{ color: '#10b981' }}/>
            <h3 style={{ margin: 0 }}>2. Log Agent Contribution</h3>
          </div>
          <form onSubmit={handleSubmitContrib}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px', marginBottom: '15px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div><label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Date / Month Specifier</label><input type="date" className="input-field" value={contribDate} onChange={(e)=>setContribDate(e.target.value)} required /></div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Masterclass</label>
                  <select className="input-field" value={contribClass} onChange={(e) => { setContribClass(e.target.value); setContribAgent(''); }} required>
                    <option value="">Select Masterclass...</option>
                    {masterclasses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              
              <div>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Target Agent</label>
                <select className="input-field" value={contribAgent} onChange={(e)=>setContribAgent(e.target.value)} required disabled={!contribClass}>
                  <option value="">Select Target Agent...</option>
                  {contribAgentsAvailable.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(16, 185, 129, 0.05)', padding: '15px', borderRadius: '12px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#10b981' }}>Users Converted</label>
                <input type="number" className="input-field" value={contribFormData.usersConverted} onChange={(e) => setContribFormData({...contribFormData, usersConverted: e.target.value})} placeholder="0" required />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#10b981' }}>Revenue Generated (₹)</label>
                <input type="number" className="input-field" value={contribFormData.revenue} onChange={(e) => setContribFormData({...contribFormData, revenue: e.target.value})} placeholder="0" required />
              </div>
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '15px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
              Save Agent Contribution
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
