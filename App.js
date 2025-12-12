import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, ChevronLeft, Stethoscope, Scissors, Lock, Calendar, 
  Check, LogOut, ChevronRight, UserX, UserCheck, Search, Bell, 
  ArrowUpCircle, X, UserPlus, Loader, MapPin, Plus, Trash2, 
  Edit2, Database, Key, Users, User, AlertTriangle
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  doc, updateDoc, setDoc, getDocs, deleteDoc, writeBatch
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';

// --- YOUR FIREBASE CONFIGURATION (INTEGRATED) ---
const firebaseConfig = {
  apiKey: "AIzaSyANB_9h7yQEtcD6wizjTl-75bx2e1kfUm4",
  authDomain: "chiplun-booking-app.firebaseapp.com",
  projectId: "chiplun-booking-app",
  storageBucket: "chiplun-booking-app.firebasestorage.app",
  messagingSenderId: "193791882498",
  appId: "1:193791882498:web:b110c3a4c2757bee62fe1b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'chiplun_live_v1'; // Keeps your data organized

// --- CONSTANTS ---
const DEFAULT_SCHEDULE = {
  Mon: { start: '09:00', end: '20:00', closed: false },
  Tue: { start: '09:00', end: '20:00', closed: false },
  Wed: { start: '09:00', end: '20:00', closed: false },
  Thu: { start: '09:00', end: '20:00', closed: false },
  Fri: { start: '09:00', end: '20:00', closed: false },
  Sat: { start: '09:00', end: '20:00', closed: false },
  Sun: { start: '09:00', end: '20:00', closed: true }
};

// --- UTILS ---
const timeToMinutes = (str) => { if (!str) return 0; const [h, m] = str.split(':').map(Number); return h * 60 + m; };
const minutesToTime = (mins) => {
  let h = Math.floor(mins / 60); const m = mins % 60; const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12; h = h ? h : 12; return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
};
const getLocalDateString = () => {
  const d = new Date(); const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
};
const addDays = (d, n) => { 
  const date = new Date(d); date.setDate(date.getDate() + n); 
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
};
const getDayName = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }); 

// --- TOAST COMPONENT ---
const Toast = ({ message, type = 'success', onClose }) => (
  <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 ${type === 'error' ? 'bg-red-900 text-white' : 'bg-gray-900 text-white'}`}>
    {type === 'success' ? <Check size={16} className="text-green-400"/> : <AlertTriangle size={16} className="text-red-400"/>}
    <span className="text-sm font-bold">{message}</span>
  </div>
);

// --- COMPONENTS ---

// 1. HOME SCREEN
const HomeScreen = ({ businesses, onSelectBusiness, onOpenOwner, onOpenMyBookings }) => {
  const [tab, setTab] = useState('doctor');
  const filtered = businesses.filter(b => (b.category || 'doctor') === tab);

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      <div className="bg-white px-6 pt-8 pb-4 shadow-sm z-10 sticky top-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Chiplun<span className="text-blue-600">Hub</span></h1>
            <p className="text-gray-400 text-xs font-bold tracking-wide uppercase">Local Services</p>
          </div>
          <button onClick={onOpenMyBookings} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-black hover:text-white transition-all active:scale-95">
            <Search size={18} />
          </button>
        </div>
        <div className="flex p-1 bg-gray-100 rounded-xl">
          <button onClick={() => setTab('doctor')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${tab === 'doctor' ? 'bg-white shadow-sm text-teal-700' : 'text-gray-400'}`}>
            <Stethoscope size={16}/> Doctors
          </button>
          <button onClick={() => setTab('salon')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${tab === 'salon' ? 'bg-white shadow-sm text-purple-700' : 'text-gray-400'}`}>
            <Scissors size={16}/> Salons
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center text-gray-400 mt-10">No {tab}s found.<br/>System is initializing...</div>
        ) : filtered.map(b => {
          const todayName = getDayName(getLocalDateString());
          // SAFE ACCESS to schedule to prevent crashes
          const sched = b.schedule?.[todayName] || { closed: false, start: b.opens_at || '09:00', end: b.closes_at || '20:00' };
          
          return (
            <div key={b.id} onClick={() => onSelectBusiness(b)} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm active:scale-[0.98] transition-all flex justify-between items-center group">
              <div className="flex items-center gap-4">
                 <div className={`w-12 h-12 rounded-full flex items-center justify-center ${b.category === 'doctor' ? 'bg-teal-50 text-teal-600' : 'bg-purple-50 text-purple-600'}`}>
                   {b.category === 'doctor' ? <Stethoscope size={20}/> : <Scissors size={20}/>}
                 </div>
                 <div>
                   <h3 className="font-bold text-gray-900 text-lg">{b.name}</h3>
                   <div className="flex items-center gap-1 mt-1 text-gray-500 text-xs font-medium">
                     <MapPin size={10}/> {b.address || 'Chiplun'}
                   </div>
                   <div className="mt-1 text-[10px] text-gray-400 font-bold uppercase">
                     {sched.closed ? <span className="text-red-500">Closed Today</span> : `${sched.start} - ${sched.end}`}
                   </div>
                 </div>
              </div>
              <ChevronRight size={20} className="text-gray-300 group-hover:text-black transition-colors"/>
            </div>
          );
        })}
      </div>
      
      <button onClick={onOpenOwner} className="p-4 text-center text-[10px] font-bold text-gray-300 hover:text-gray-500 uppercase tracking-widest pb-8">Partner Login</button>
    </div>
  );
};

// 2. SUPER ADMIN PORTAL
const AdminPortal = ({ businesses, onBack }) => {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '', type: 'clinic', category: 'doctor', pin: '', address: '', 
    phone: '', bufferMinutes: 5, services: [], staff: [], schedule: DEFAULT_SCHEDULE,
    lunch_start: '', lunch_end: ''
  });
  
  const [serviceInput, setServiceInput] = useState({ name: '', duration: 15 });
  const [staffInput, setStaffInput] = useState('');
  const [adminTab, setAdminTab] = useState('basic'); 

  const resetForm = () => {
    setForm({
      name: '', type: 'clinic', category: 'doctor', pin: '', address: '', 
      phone: '', bufferMinutes: 5, services: [], staff: [], schedule: DEFAULT_SCHEDULE,
      lunch_start: '', lunch_end: ''
    });
    setEditingId(null);
    setAdminTab('basic');
  };

  const handleSave = async () => {
    try {
      const dataToSave = { 
        ...form, 
        staff: form.staff || [], 
        schedule: form.schedule || DEFAULT_SCHEDULE,
        // Ensure opens_at exists for backward compat
        opens_at: form.schedule?.Mon?.start || '09:00',
        closes_at: form.schedule?.Mon?.end || '20:00'
      };
      
      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'businesses', editingId), dataToSave);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'businesses'), dataToSave);
      }
      alert("Changes Saved Successfully!");
      resetForm();
    } catch (e) { console.error(e); alert("Error saving"); }
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this business?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'businesses', id));
    }
  };

  const handleSeed = async () => {
    if(!confirm("Reset database?")) return;
    const batch = writeBatch(db);
    const ref1 = doc(collection(db, 'artifacts', appId, 'public', 'data', 'businesses'));
    batch.set(ref1, {
      name: 'Dr. Deshmukh Clinic', type: 'clinic', category: 'doctor', pin: '1001', address: 'Near Bus Stand', phone: '9876543210',
      multiSelect: false, bufferMinutes: 5, schedule: DEFAULT_SCHEDULE,
      services: [{ id: 'c1', name: 'Consultation', duration: 15 }, { id: 'c2', name: 'Follow Up', duration: 10 }],
      staff: [{ id: 'doc1', name: 'Dr. Deshmukh' }],
      lunch_start: '13:00', lunch_end: '14:00'
    });
    const ref2 = doc(collection(db, 'artifacts', appId, 'public', 'data', 'businesses'));
    batch.set(ref2, {
      name: 'Sahyadri Salon', type: 'salon', category: 'salon', pin: '2002', address: 'Bahadursheikh Naka', phone: '9876541122',
      multiSelect: true, bufferMinutes: 10, schedule: DEFAULT_SCHEDULE,
      services: [{ id: 's1', name: 'Haircut', duration: 30 }, { id: 's2', name: 'Shave', duration: 15 }, { id: 's3', name: 'Facial', duration: 45 }],
      staff: [{ id: 'st1', name: 'Raju' }, { id: 'st2', name: 'Amit' }],
      lunch_start: '14:00', lunch_end: '15:00'
    });
    await batch.commit();
    alert("Defaults Restored");
  };

  const addService = () => {
    if (!serviceInput.name) return;
    setForm(prev => ({ ...prev, services: [...prev.services, { id: Date.now().toString(), ...serviceInput }] }));
    setServiceInput({ name: '', duration: 15 });
  };

  const addStaff = () => {
    if (!staffInput) return;
    setForm(prev => ({ ...prev, staff: [...(prev.staff || []), { id: Date.now().toString(), name: staffInput }] }));
    setStaffInput('');
  };

  const removeService = (idx) => {
    setForm(prev => ({ ...prev, services: prev.services.filter((_, i) => i !== idx) }));
  };

  const removeStaff = (idx) => {
    setForm(prev => ({ ...prev, staff: prev.staff.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-black text-white p-4 sticky top-0 z-20 flex justify-between items-center shadow-md">
        <h2 className="font-bold flex items-center gap-2"><Key size={16}/> Super Admin</h2>
        <button onClick={onBack} className="text-xs bg-gray-800 px-3 py-1 rounded">Logout</button>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold mb-4">{editingId ? 'Edit Business' : 'Add New'}</h3>
          
          <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
             {['basic', 'services', 'staff', 'schedule'].map(t => (
               <button key={t} onClick={() => setAdminTab(t)} className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${adminTab === t ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>
                 {t}
               </button>
             ))}
          </div>

          {adminTab === 'basic' && (
            <div className="space-y-3">
              <input placeholder="Name" className="w-full p-2 border rounded" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <div className="flex gap-2">
                <select className="p-2 border rounded flex-1" value={form.category} onChange={e => setForm({...form, category: e.target.value, type: e.target.value === 'doctor' ? 'clinic' : 'salon'})}>
                  <option value="doctor">Doctor</option><option value="salon">Salon</option>
                </select>
                <input placeholder="PIN" className="w-20 p-2 border rounded" value={form.pin} onChange={e => setForm({...form, pin: e.target.value})} maxLength={4} />
              </div>
              <input placeholder="Address" className="w-full p-2 border rounded" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
              
              <div className="bg-gray-50 p-2 rounded">
                <span className="text-xs font-bold text-gray-400 uppercase">Lunch / Break Time</span>
                <div className="flex gap-2 mt-1">
                  <input type="time" className="p-2 border rounded flex-1 text-sm" value={form.lunch_start} onChange={e => setForm({...form, lunch_start: e.target.value})} />
                  <span className="self-center">-</span>
                  <input type="time" className="p-2 border rounded flex-1 text-sm" value={form.lunch_end} onChange={e => setForm({...form, lunch_end: e.target.value})} />
                </div>
              </div>
            </div>
          )}

          {adminTab === 'services' && (
            <div>
              <div className="flex gap-2 mb-2">
                <input placeholder="Service" className="flex-1 p-2 border rounded" value={serviceInput.name} onChange={e => setServiceInput({...serviceInput, name: e.target.value})} />
                <input type="number" placeholder="Min" className="w-16 p-2 border rounded" value={serviceInput.duration} onChange={e => setServiceInput({...serviceInput, duration: parseInt(e.target.value)})} />
                <button onClick={addService} className="bg-black text-white px-3 rounded">+</button>
              </div>
              <div className="space-y-1">
                {form.services.map((s, i) => (
                  <div key={i} className="flex justify-between p-2 bg-gray-50 rounded text-xs items-center">
                    <span>{s.name} ({s.duration}m)</span>
                    <button onClick={() => removeService(i)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={14}/></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {adminTab === 'staff' && (
            <div>
              <div className="flex gap-2 mb-2">
                <input placeholder="Staff Name" className="flex-1 p-2 border rounded" value={staffInput} onChange={e => setStaffInput(e.target.value)} />
                <button onClick={addStaff} className="bg-black text-white px-3 rounded">+</button>
              </div>
              <div className="space-y-1">
                {(form.staff || []).map((s, i) => (
                  <div key={i} className="flex justify-between p-2 bg-gray-50 rounded text-xs items-center">
                    <span className="flex items-center gap-2"><User size={12}/> {s.name}</span>
                    <button onClick={() => removeStaff(i)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={14}/></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {adminTab === 'schedule' && (
            <div className="space-y-2 h-48 overflow-y-auto">
              {Object.keys(form.schedule || DEFAULT_SCHEDULE).map(day => (
                <div key={day} className="flex items-center gap-2 text-xs">
                  <span className="w-8 font-bold">{day}</span>
                  <input type="checkbox" checked={!(form.schedule?.[day]?.closed)} onChange={(e) => {
                     const newSched = { ...form.schedule }; newSched[day].closed = !e.target.checked; setForm({ ...form, schedule: newSched });
                  }} />
                  <span className={form.schedule?.[day]?.closed ? 'text-gray-300' : 'text-black'}>Open</span>
                  {!form.schedule?.[day]?.closed && (
                    <>
                      <input type="time" className="border rounded p-1" value={form.schedule?.[day]?.start} onChange={(e) => {
                         const newSched = { ...form.schedule }; newSched[day].start = e.target.value; setForm({ ...form, schedule: newSched });
                      }} />
                      <span>-</span>
                      <input type="time" className="border rounded p-1" value={form.schedule?.[day]?.end} onChange={(e) => {
                         const newSched = { ...form.schedule }; newSched[day].end = e.target.value; setForm({ ...form, schedule: newSched });
                      }} />
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <button onClick={handleSave} className="w-full mt-4 bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition-all animate-pulse">Save Changes</button>
          {editingId && <button onClick={resetForm} className="w-full mt-2 border py-2 rounded text-gray-500">Cancel Edit</button>}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
             <h3 className="font-bold text-gray-400 text-xs uppercase">Manage Businesses</h3>
             <button onClick={handleSeed} className="text-xs text-blue-600 flex items-center gap-1"><Database size={12}/> Reset Data</button>
          </div>
          {businesses.map(b => (
            <div key={b.id} className="bg-white p-3 rounded-lg border flex justify-between items-center">
              <div><div className="font-bold">{b.name}</div><div className="text-xs text-gray-500 capitalize">{b.category}</div></div>
              <div className="flex gap-2">
                <button onClick={() => { setEditingId(b.id); setForm({ ...b, staff: b.staff || [], schedule: b.schedule || DEFAULT_SCHEDULE, lunch_start: b.lunch_start || '', lunch_end: b.lunch_end || '' }); }} className="p-2 bg-gray-50 rounded text-blue-600"><Edit2 size={16}/></button>
                <button onClick={() => handleDelete(b.id)} className="p-2 bg-gray-50 rounded text-red-600"><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 3. BOOKING SCREEN
const BookingScreen = ({ business, onBack, user }) => {
  const [date, setDate] = useState(getLocalDateString());
  const [selectedServices, setSelectedServices] = useState([business.services?.[0] || { name: 'Default', duration: 15, id: 'def' }]);
  const [selectedStaff, setSelectedStaff] = useState(null); 
  const [selectedStartMinutes, setSelectedStartMinutes] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState('services'); 
  const [formData, setFormData] = useState({ name: '', phone: '', age: '', gender: 'Male', symptoms: '' });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('chiplun_user');
    if (saved) setFormData(prev => ({ ...prev, ...JSON.parse(saved) }));
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'appointments');
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => d.data()).filter(b => b.business_id === business.id && b.date === date).filter(b => b.status !== 'cancelled' && b.status !== 'no_show'); 
      setAppointments(data);
    });
    return () => unsub();
  }, [business.id, date, user]);

  const totalDuration = useMemo(() => selectedServices.reduce((acc, s) => acc + s.duration, 0), [selectedServices]);

  const toggleService = (service) => {
    if (business.multiSelect) {
      if (selectedServices.find(s => s.id === service.id)) { if (selectedServices.length > 1) setSelectedServices(prev => prev.filter(s => s.id !== service.id)); } 
      else { setSelectedServices(prev => [...prev, service]); }
    } else { setSelectedServices([service]); }
    setSelectedStartMinutes(null);
  };

  const getSlotStatus = (slotStart) => {
    const slotEnd = slotStart + totalDuration;
    const dayName = getDayName(date);
    const schedule = business.schedule?.[dayName] || { start: '09:00', end: '20:00', closed: false };
    
    if (schedule.closed) return 'closed';
    if (slotEnd > timeToMinutes(schedule.end) || slotStart < timeToMinutes(schedule.start)) return 'closed';

    if (business.lunch_start && business.lunch_end) {
      const bStart = timeToMinutes(business.lunch_start);
      const bEnd = timeToMinutes(business.lunch_end);
      if (slotStart < bEnd && slotEnd > bStart) return 'closed';
    }

    const staffList = (business.staff && business.staff.length > 0) ? business.staff : [{id: 'default', name: 'Main'}];
    const conflictingApps = appointments.filter(a => {
        const aptEnd = a.end_minutes + (business.bufferMinutes || 0);
        return (slotStart < aptEnd && slotEnd > a.start_minutes);
    });

    if (selectedStaff) {
      const isBusy = conflictingApps.some(a => a.staff_id === selectedStaff.id);
      return isBusy ? 'booked' : 'available';
    } else {
      const busyStaffIds = new Set(conflictingApps.map(a => a.staff_id));
      return (busyStaffIds.size < staffList.length) ? 'available' : 'booked';
    }
  };

  const grid = useMemo(() => {
    const slots = [];
    const dayName = getDayName(date);
    const schedule = business.schedule?.[dayName] || { start: '09:00', end: '20:00', closed: false };
    if(schedule.closed) return [];
    const startMins = timeToMinutes(schedule.start);
    const endMins = timeToMinutes(schedule.end);
    for (let m = startMins; m < endMins; m += 15) {
      const status = getSlotStatus(m);
      if (status !== 'closed') slots.push({ minutes: m, label: minutesToTime(m), status });
    }
    return slots;
  }, [business, appointments, totalDuration, selectedStaff, date]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (getSlotStatus(selectedStartMinutes) !== 'available') { 
        setToast({msg: "Slot taken.", type: 'error'}); 
        setTimeout(() => setToast(null), 3000); setStep('slots'); return; 
    }
    setIsSubmitting(true);
    
    let assignedStaffId = selectedStaff?.id;
    let assignedStaffName = selectedStaff?.name;
    
    if (!assignedStaffId) {
       const staffList = (business.staff && business.staff.length > 0) ? business.staff : [{id: 'default', name: 'Main'}];
       const conflictingApps = appointments.filter(a => {
          const aptEnd = a.end_minutes + (business.bufferMinutes || 0);
          return (selectedStartMinutes < aptEnd && (selectedStartMinutes + totalDuration) > a.start_minutes);
       });
       const busyIds = new Set(conflictingApps.map(a => a.staff_id));
       const freeStaff = staffList.find(s => !busyIds.has(s.id));
       if (freeStaff) { assignedStaffId = freeStaff.id; assignedStaffName = freeStaff.name; }
       else { assignedStaffId = 'default'; assignedStaffName = 'Staff'; }
    }

    localStorage.setItem('chiplun_user', JSON.stringify({ name: formData.name, phone: formData.phone, age: formData.age, gender: formData.gender }));

    try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'appointments'), {
          business_id: business.id, business_name: business.name, customer_name: formData.name, customer_phone: formData.phone,
          customer_age: formData.age || 'N/A', customer_gender: formData.gender || 'N/A', customer_symptoms: formData.symptoms || 'N/A',
          service_names: selectedServices.map(s => s.name).join(', '), total_duration: totalDuration, date: date,
          start_minutes: selectedStartMinutes, end_minutes: selectedStartMinutes + totalDuration, status: 'booked', 
          staff_id: assignedStaffId, staff_name: assignedStaffName, 
          created_at: new Date().toISOString(),
        });
        setStep('success');
    } catch (err) { console.error(err); }
    setIsSubmitting(false);
  };

  if (step === 'success') return (
    <div className="flex flex-col items-center justify-center h-screen bg-white p-6 text-center animate-in zoom-in">
      <CheckCircle size={80} className="text-black mb-6" />
      <h2 className="text-2xl font-bold text-gray-900">Confirmed</h2>
      <div className="mt-8 text-4xl font-mono font-bold">{minutesToTime(selectedStartMinutes)}</div>
      <button onClick={onBack} className="mt-12 text-gray-500 font-bold hover:text-black transition-colors">Return Home</button>
    </div>
  );

  return (
    <div className="pb-10 min-h-screen bg-white flex flex-col font-sans">
      <div className="bg-white p-4 flex items-center gap-3 border-b border-gray-100 sticky top-0 z-20">
        <button onClick={() => step === 'services' ? onBack() : setStep(step === 'staff' ? 'services' : step === 'slots' ? 'staff' : 'slots')} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft size={24}/></button>
        <div><h2 className="font-bold text-lg">{business.name}</h2><p className="text-xs text-gray-400 capitalize">Step: {step}</p></div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {step === 'services' && (
           <div className="space-y-3">
             <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Select Services</div>
             {(business.services || []).map(s => {
               const isSelected = selectedServices.find(sel => sel.id === s.id);
               return (
                 <button key={s.id} onClick={() => { if(business.multiSelect) { if (isSelected && selectedServices.length > 1) setSelectedServices(p => p.filter(x => x.id !== s.id)); else if(!isSelected) setSelectedServices(p => [...p, s]); } else setSelectedServices([s]); }} className={`w-full p-4 rounded-xl text-left border transition-all flex justify-between items-center ${isSelected ? `border-black bg-gray-50 ring-1 ring-black` : 'bg-white border-gray-200'}`}>
                   <span className="font-medium">{s.name}</span>
                   <div className="flex items-center gap-2 text-xs opacity-60"><span>{s.duration}m</span>{isSelected && <Check size={14}/>}</div>
                 </button>
               );
             })}
             <button onClick={() => setStep(business.staff && business.staff.length > 0 ? 'staff' : 'slots')} className="w-full bg-black text-white py-4 rounded-xl font-bold mt-6 shadow-lg active:scale-95 transition-transform">Next</button>
           </div>
        )}
        
        {step === 'staff' && (
           <div className="space-y-3">
             <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Select Professional</div>
             <button onClick={() => setSelectedStaff(null)} className={`w-full p-4 rounded-xl text-left border transition-all flex justify-between items-center ${!selectedStaff ? `border-black bg-gray-50` : 'bg-white border-gray-200'}`}>
                <span className="font-bold">Any Available</span>
                {!selectedStaff && <Check size={14}/>}
             </button>
             {business.staff.map(s => (
               <button key={s.id} onClick={() => setSelectedStaff(s)} className={`w-full p-4 rounded-xl text-left border transition-all flex justify-between items-center ${selectedStaff?.id === s.id ? `border-black bg-gray-50` : 'bg-white border-gray-200'}`}>
                 <span className="font-medium">{s.name}</span>
                 {selectedStaff?.id === s.id && <Check size={14}/>}
               </button>
             ))}
             <button onClick={() => setStep('slots')} className="w-full bg-black text-white py-4 rounded-xl font-bold mt-6 shadow-lg">Find Slots</button>
           </div>
        )}

        {step === 'slots' && (
           <div className="space-y-6">
             <div className="bg-gray-50 p-3 rounded-xl flex items-center border border-gray-200">
                <Calendar className="text-gray-400 ml-2" size={20}/><input type="date" value={date} min={getLocalDateString()} onChange={e => setDate(e.target.value)} className="bg-transparent p-2 font-bold text-gray-700 outline-none flex-1"/>
             </div>
             <div className="grid grid-cols-4 gap-2">
               {grid.length === 0 ? <div className="col-span-4 text-center text-gray-400 py-4">Fully Booked / Closed</div> : grid.map(slot => (
                 <button key={slot.minutes} disabled={slot.status !== 'available'} onClick={() => { setSelectedStartMinutes(slot.minutes); setStep('form'); }} 
                   className={`py-3 px-1 rounded-lg text-xs font-bold border transition-all ${slot.status === 'available' ? 'bg-white border-gray-200 hover:border-black text-gray-700 hover:bg-black hover:text-white' : 'bg-gray-50 border-gray-100 text-gray-300 decoration-slice'}`}>
                   {slot.label.replace(/ [AP]M/, '')}
                 </button>
               ))}
             </div>
           </div>
        )}
        {step === 'form' && (
           <div className="space-y-4 animate-in slide-in-from-right-4">
             <div className="p-4 rounded-xl text-white bg-black shadow-lg mb-6">
               <div className="text-3xl font-bold mb-1">{minutesToTime(selectedStartMinutes)}</div>
               <div className="opacity-80 text-sm">{selectedServices.map(s => s.name).join(', ')}</div>
               {selectedStaff && <div className="mt-2 text-xs bg-gray-800 inline-block px-2 py-1 rounded">With {selectedStaff.name}</div>}
               {!selectedStaff && <div className="mt-2 text-xs bg-gray-800 inline-block px-2 py-1 rounded">Auto-Assigned</div>}
             </div>
             <input required placeholder="Full Name" value={formData.name} className="w-full p-4 bg-gray-50 rounded-xl outline-none" onChange={e => setFormData({...formData, name: e.target.value})} />
             <input required type="tel" placeholder="Mobile Number" value={formData.phone} className="w-full p-4 bg-gray-50 rounded-xl outline-none" onChange={e => setFormData({...formData, phone: e.target.value})} />
             {business.category === 'doctor' && (
               <>
                 <div className="flex gap-4"><input type="number" placeholder="Age" value={formData.age} className="w-1/3 p-4 bg-gray-50 rounded-xl outline-none" onChange={e => setFormData({...formData, age: e.target.value})} /><select value={formData.gender} className="flex-1 p-4 bg-gray-50 rounded-xl outline-none" onChange={e => setFormData({...formData, gender: e.target.value})}><option value="Male">Male</option><option value="Female">Female</option></select></div>
                 <textarea placeholder="Symptoms" value={formData.symptoms} className="w-full p-4 bg-gray-50 rounded-xl outline-none h-28 resize-none" onChange={e => setFormData({...formData, symptoms: e.target.value})} />
               </>
             )}
             <button disabled={isSubmitting} onClick={handleSubmit} className="w-full bg-black text-white py-4 rounded-xl font-bold mt-4 shadow-xl flex justify-center items-center gap-2">
               {isSubmitting ? <Loader className="animate-spin" size={18}/> : 'Confirm'}
             </button>
           </div>
        )}
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

// 4. OWNER PORTAL
const OwnerPortal = ({ user, businesses, onExit, onOpenAdmin }) => {
  const [pin, setPin] = useState('');
  const [business, setBusiness] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [viewDate, setViewDate] = useState(getLocalDateString());
  
  useEffect(() => {
    const savedId = localStorage.getItem('chiplun_owner_id');
    if (savedId) { const found = businesses.find(b => b.id === savedId); if (found) setBusiness(found); }
  }, [businesses]);

  useEffect(() => {
    if (!business || !user) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'appointments');
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(a => a.business_id === business.id && a.date === viewDate);
      const sorted = data.sort((a, b) => a.start_minutes - b.start_minutes);
      setAppointments(sorted);
    });
    return () => unsub();
  }, [business, viewDate, user]);

  const updateStatus = async (aptId, newStatus) => {
    try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'appointments', aptId), { status: newStatus }); } catch (e) { console.error(e); }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (pin === '112607') { onOpenAdmin(); return; }
    const f = businesses.find(b => b.pin === pin);
    if(f) { setBusiness(f); localStorage.setItem('chiplun_owner_id', f.id); } 
    else alert('Invalid PIN'); 
  };

  if (!business) return (
    <div className="flex flex-col items-center justify-center h-screen bg-white p-6 animate-in zoom-in">
      <h2 className="text-2xl font-black mb-1">Partner Login</h2>
      <p className="text-gray-400 text-sm mb-8">Secure Access</p>
      <form onSubmit={handleLogin} className="w-full max-w-xs space-y-4">
        <input type="password" placeholder="ENTER PIN" className="w-full p-4 text-center bg-gray-50 rounded-xl text-2xl tracking-widest outline-none font-bold" value={pin} onChange={e => setPin(e.target.value)} maxLength={6}/>
        <button className="w-full bg-black text-white py-4 rounded-xl font-bold">Enter</button>
      </form>
      <button onClick={onExit} className="mt-8 text-gray-400 text-xs tracking-widest">EXIT</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white pb-20 font-sans">
      <div className="px-6 py-6 sticky top-0 bg-white/95 backdrop-blur z-20 flex justify-between items-end border-b border-gray-50">
        <div><h1 className="text-2xl font-black text-gray-900">{business.name}</h1><div className="flex items-center gap-2 mt-1"><button onClick={() => setViewDate(addDays(viewDate, -1))}><ChevronLeft size={16} className="text-gray-400"/></button><span className="font-mono text-sm font-bold text-gray-500 uppercase">{viewDate}</span><button onClick={() => setViewDate(addDays(viewDate, 1))}><ChevronRight size={16} className="text-gray-400"/></button></div></div>
        <button onClick={() => { localStorage.removeItem('chiplun_owner_id'); setBusiness(null); }} className="bg-gray-100 p-2 rounded-full text-gray-500"><LogOut size={16}/></button>
      </div>
      <div className="p-4 space-y-4">
        {appointments.length === 0 ? <div className="text-center text-gray-300 py-10">No bookings for this date.</div> : appointments.map(apt => (
          <div key={apt.id} className={`p-4 rounded-xl border ${apt.status === 'completed' ? 'border-green-200 bg-green-50' : apt.status === 'cancelled' || apt.status === 'no_show' ? 'border-red-200 bg-red-50 opacity-50' : 'border-gray-200 bg-white shadow-sm'}`}>
             <div className="flex justify-between items-start">
               <div><span className="font-mono font-bold text-xl">{minutesToTime(apt.start_minutes)}</span><div className="font-bold text-lg">{apt.customer_name}</div></div>
               {apt.status === 'booked' && <div className="flex gap-2"><button onClick={() => updateStatus(apt.id, 'completed')} className="p-2 bg-green-100 text-green-700 rounded-full"><Check size={16}/></button><button onClick={() => updateStatus(apt.id, 'no_show')} className="p-2 bg-red-100 text-red-700 rounded-full"><UserX size={16}/></button></div>}
             </div>
             <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-2 items-center">
                <span>{apt.service_names}</span>
                {apt.staff_name && <span className="bg-black text-white px-2 py-0.5 rounded font-bold">With {apt.staff_name}</span>}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 5. PATIENT DASHBOARD
const PatientDashboard = ({ user, onBack }) => {
  const [phone, setPhone] = useState('');
  const [bookings, setBookings] = useState([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const savedProfile = localStorage.getItem('chiplun_user');
    if (savedProfile) { const p = JSON.parse(savedProfile); if (p.phone) setPhone(p.phone); }
  }, []);

  const fetchBookings = async (e) => {
    if(e) e.preventDefault();
    if (!phone) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'appointments');
    const snapshot = await getDocs(q);
    const myBookings = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(b => b.customer_phone === phone)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    setBookings(myBookings);
    setSearched(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="bg-white p-4 flex items-center gap-3 shadow-sm sticky top-0">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft size={24}/></button>
        <h2 className="font-bold text-lg">My Appointments</h2>
      </div>
      <div className="p-4">
        {!searched ? (
          <div className="mt-10 text-center">
             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100"><Search className="text-gray-400"/></div>
             <h3 className="font-bold text-gray-900">Track Status</h3>
             <form onSubmit={fetchBookings} className="mt-6">
               <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Mobile Number" className="w-full p-4 bg-white rounded-xl text-center font-bold text-lg shadow-sm border border-transparent focus:border-blue-500 outline-none mb-4"/>
               <button className="w-full bg-black text-white py-4 rounded-xl font-bold flex justify-center">Search</button>
             </form>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.length === 0 ? <div className="text-center text-gray-400 mt-10">No records found.</div> : bookings.map(apt => (
              <div key={apt.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                 <div className="flex justify-between items-start">
                   <div>
                     <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{apt.date}</span>
                     <h3 className="font-bold text-gray-900 text-lg">{apt.business_name}</h3>
                   </div>
                   <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wide ${apt.status === 'booked' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{apt.status}</span>
                 </div>
                 <div className="mt-4 flex flex-col gap-1">
                    <span className="text-3xl font-mono font-bold text-gray-900">{minutesToTime(apt.start_minutes)}</span>
                    <span className="text-xs text-gray-500">{apt.service_names}</span>
                    {apt.staff_name && <div className="text-xs font-bold text-black mt-1 flex items-center gap-1"><User size={12}/> With: {apt.staff_name}</div>}
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState('home');
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [user, setUser] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  // AUTO-SEED LOGIC
  const autoSeedIfNeeded = async (snapshot) => {
    if (snapshot.empty) {
      const batch = writeBatch(db);
      const ref1 = doc(collection(db, 'artifacts', appId, 'public', 'data', 'businesses'));
      batch.set(ref1, {
        name: 'Dr. Deshmukh Clinic', type: 'clinic', category: 'doctor', pin: '1001', address: 'Near Bus Stand', phone: '9876543210',
        multiSelect: false, bufferMinutes: 5, schedule: DEFAULT_SCHEDULE,
        services: [{ id: 'c1', name: 'Consultation', duration: 15 }],
        staff: [{ id: 'doc1', name: 'Dr. Deshmukh' }],
        lunch_start: '13:00', lunch_end: '14:00'
      });
      const ref2 = doc(collection(db, 'artifacts', appId, 'public', 'data', 'businesses'));
      batch.set(ref2, {
        name: 'Sahyadri Salon', type: 'salon', category: 'salon', pin: '2002', address: 'Bahadursheikh Naka', phone: '9876541122',
        multiSelect: true, bufferMinutes: 10, schedule: DEFAULT_SCHEDULE,
        services: [{ id: 's1', name: 'Haircut', duration: 30 }, { id: 's2', name: 'Shave', duration: 15 }],
        staff: [{ id: 'st1', name: 'Raju' }, { id: 'st2', name: 'Amit' }],
        lunch_start: '14:00', lunch_end: '15:00'
      });
      await batch.commit();
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { await signInWithCustomToken(auth, __initial_auth_token); } else { await signInAnonymously(auth); }
    };
    initAuth();
    onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'businesses');
    const unsub = onSnapshot(q, (snapshot) => {
      setBusinesses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
      autoSeedIfNeeded(snapshot); 
    });
    return () => unsub();
  }, [user]);

  if (!user) return <div className="h-screen flex items-center justify-center text-gray-400">Loading Chiplun Hub...</div>;

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen shadow-2xl relative font-sans text-gray-900">
      {view === 'home' && <HomeScreen businesses={businesses} onSelectBusiness={(b) => { setSelectedBusiness(b); setView('booking'); }} onOpenOwner={() => setView('owner')} onOpenMyBookings={() => setView('my_bookings')} />}
      {view === 'booking' && selectedBusiness && <BookingScreen business={selectedBusiness} onBack={() => { setSelectedBusiness(null); setView('home'); }} user={user} />}
      {view === 'owner' && <OwnerPortal businesses={businesses} user={user} onExit={() => setView('home')} onOpenAdmin={() => setView('admin')} />}
      {view === 'my_bookings' && <PatientDashboard user={user} onBack={() => setView('home')} />}
      {view === 'admin' && <AdminPortal businesses={businesses} onBack={() => setView('home')} />}
    </div>
  );
}


