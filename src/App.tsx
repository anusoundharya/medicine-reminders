import { useEffect, useMemo, useState } from 'react'
import './App.css'

type Page = 'dashboard' | 'add' | 'medicines' | 'pharmacies' | 'reminder'
type Medicine = { id: number; name: string; dose: string; time: string; frequency: string; taken: boolean; stock: number }
type Pharmacy = { name: string; area: string; distance: string; open: string; phone: string }

const starterMedicines: Medicine[] = [
  { id: 1, name: 'Vitamin D3', dose: '1 tablet', time: '08:00', frequency: 'Daily', taken: true, stock: 18 },
  { id: 2, name: 'Amlodipine', dose: '5 mg', time: '13:00', frequency: 'Daily', taken: false, stock: 8 },
  { id: 3, name: 'Metformin', dose: '500 mg', time: '20:30', frequency: 'After dinner', taken: false, stock: 24 },
]

const pharmacies: Pharmacy[] = [
  { name: 'Apollo Pharmacy', area: 'Anna Nagar, Chennai', distance: '0.8 km', open: 'Open until 10:30 PM', phone: '+91 44 4012 8800' },
  { name: 'MedPlus Health Services', area: 'Shanti Colony, Chennai', distance: '1.4 km', open: 'Open until 11:00 PM', phone: '+91 44 4356 2300' },
  { name: 'Wellness Forever', area: 'Nungambakkam, Chennai', distance: '2.1 km', open: 'Open until 9:30 PM', phone: '+91 44 2817 1155' },
]

const pageInfo: Record<Page, { label: string; title: string; description: string }> = {
  dashboard: { label: 'YOUR HEALTH OVERVIEW', title: 'Good morning, Anu', description: 'Stay on top of your health, one dose at a time.' },
  medicines: { label: 'MEDICINE CABINET', title: 'Your medicines', description: 'Keep every prescription and reminder in one calm place.' },
  pharmacies: { label: 'FIND CARE NEARBY', title: 'Pharmacies around you', description: 'Find trusted pharmacies and get your medicines when you need them.' },
  add: { label: 'NEW PRESCRIPTION', title: 'Add medicine', description: 'Create a clear reminder for every important dose.' },
  reminder: { label: 'NEXT REMINDER', title: 'Medicine reminder', description: 'Take control of your next dose with one simple action.' },
}

function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [medicines, setMedicines] = useState<Medicine[]>(() => {
    const saved = localStorage.getItem('medicine-reminders')
    return saved ? (JSON.parse(saved) as Medicine[]).map((medicine) => ({ ...medicine, stock: medicine.stock ?? 30 })) : starterMedicines
  })
  const [showForm, setShowForm] = useState(false)
  const [notice, setNotice] = useState('')
  const [medicineSearch, setMedicineSearch] = useState('')
  const [pharmacySearch, setPharmacySearch] = useState('')
  const [medicineFilter, setMedicineFilter] = useState<'all' | 'morning' | 'evening'>('all')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', dose: '', time: '09:00', frequency: 'Daily' })
  const [history, setHistory] = useState<string[]>(() => JSON.parse(localStorage.getItem('dose-history') ?? '[]'))
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  useEffect(() => { localStorage.setItem('medicine-reminders', JSON.stringify(medicines)) }, [medicines])
  useEffect(() => { localStorage.setItem('dose-history', JSON.stringify(history)) }, [history])
  useEffect(() => {
    const checkDueMedicine = () => {
      const currentTime = new Date().toTimeString().slice(0, 5)
      const dueMedicine = medicines.find((medicine) => medicine.time === currentTime && !medicine.taken)
      if (!dueMedicine) return
      const reminderKey = `notified-${new Date().toISOString().slice(0, 10)}-${dueMedicine.id}-${currentTime}`
      if (localStorage.getItem(reminderKey)) return
      localStorage.setItem(reminderKey, 'true')
      if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') new Notification(`Time for ${dueMedicine.name}`, { body: `${dueMedicine.dose} · ${dueMedicine.frequency}` })
      try {
        const audioContext = new AudioContext()
        const oscillator = audioContext.createOscillator()
        const gain = audioContext.createGain()
        oscillator.frequency.value = 880
        gain.gain.setValueAtTime(.08, audioContext.currentTime)
        gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .45)
        oscillator.connect(gain).connect(audioContext.destination)
        oscillator.start()
        oscillator.stop(audioContext.currentTime + .45)
      } catch { }
      flash(`It is time for ${dueMedicine.name}`)
    }
    checkDueMedicine()
    const timer = window.setInterval(checkDueMedicine, 30000)
    return () => window.clearInterval(timer)
  }, [medicines, notificationsEnabled])

  const filteredPharmacies = useMemo(() => pharmacies.filter((pharmacy) => `${pharmacy.name} ${pharmacy.area}`.toLowerCase().includes(pharmacySearch.toLowerCase())), [pharmacySearch])
  const visibleMedicines = useMemo(() => medicines.filter((medicine) => medicineFilter === 'all' || (medicineFilter === 'morning' ? medicine.time < '12:00' : medicine.time >= '12:00')), [medicines, medicineFilter])
  const completed = medicines.filter((medicine) => medicine.taken).length
  const nextMedicine = medicines.find((medicine) => !medicine.taken)
  const flash = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2500) }
  const toggleTaken = (id: number) => setMedicines((current) => current.map((medicine) => {
    if (medicine.id !== id) return medicine
    const taking = !medicine.taken
    if (taking) {
      setHistory((items) => [`${new Date().toLocaleDateString()} · ${medicine.name}`, ...items].slice(0, 20))
      if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') new Notification(`${medicine.name} marked as taken`, { body: 'Your dose history was updated.' })
    }
    return { ...medicine, taken: taking, stock: taking ? Math.max(0, medicine.stock - 1) : medicine.stock + 1 }
  }))
  const navigate = (nextPage: Page) => { setPage(nextPage); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const useLocation = () => {
    if (!navigator.geolocation) { flash('Location is not available in this browser'); return }
    navigator.geolocation.getCurrentPosition(() => flash('Showing pharmacies near your location'), () => flash('Location permission was not granted'))
  }
  const enableNotifications = async () => {
    if (!('Notification' in window)) { flash('Browser notifications are not supported'); return }
    const permission = await Notification.requestPermission()
    setNotificationsEnabled(permission === 'granted')
    flash(permission === 'granted' ? 'Notifications enabled' : 'Notification permission was not granted')
  }
  const addMedicine = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name.trim() || !form.dose.trim()) return
    setMedicines((current) => editingId === null ? [...current, { ...form, id: Date.now(), name: form.name.trim(), dose: form.dose.trim(), taken: false, stock: 30 }] : current.map((medicine) => medicine.id === editingId ? { ...medicine, ...form, name: form.name.trim(), dose: form.dose.trim() } : medicine))
    setForm({ name: '', dose: '', time: '09:00', frequency: 'Daily' })
    setEditingId(null)
    setShowForm(false)
    navigate('medicines')
    flash(editingId === null ? 'Medicine added successfully' : 'Medicine updated successfully')
  }

  const editMedicine = (medicine: Medicine) => { setForm({ name: medicine.name, dose: medicine.dose, time: medicine.time, frequency: medicine.frequency }); setEditingId(medicine.id); setShowForm(false); navigate('add') }
  const deleteMedicine = (id: number) => { setMedicines((current) => current.filter((medicine) => medicine.id !== id)); flash('Medicine deleted') }
  const skipMedicine = () => { if (nextMedicine) { setHistory((items) => [`${new Date().toLocaleDateString()} · ${nextMedicine.name} skipped`, ...items].slice(0, 20)); setMedicines((current) => current.map((medicine) => medicine.id === nextMedicine.id ? { ...medicine, taken: true } : medicine)); flash(`${nextMedicine.name} skipped for now`) } }

  const navItems: { id: Page; icon: string; label: string }[] = [
    { id: 'dashboard', icon: '⌂', label: 'Dashboard' },
    { id: 'add', icon: '＋', label: 'Add medicine' },
    { id: 'medicines', icon: '✚', label: 'My medicines' },
    { id: 'pharmacies', icon: '⌖', label: 'Pharmacies' },
    { id: 'reminder', icon: '◷', label: 'Reminder' },
  ]

  const renderReminders = (compact = false, items = medicines) => (
    <section className={`reminder-list ${compact ? 'compact-list' : ''}`}>
      {items.length === 0 ? <div className="empty-state">No reminders match this view.</div> : items.map((medicine) => (
        <article className={`reminder-row ${medicine.taken ? 'is-taken' : ''}`} key={medicine.id}>
          <div className="time-block"><strong>{medicine.time}</strong><span>{medicine.time < '12:00' ? 'AM' : 'PM'}</span></div>
          <div className="pill-icon">✚</div>
          <div className="medicine-info"><h3>{medicine.name}</h3><p>{medicine.dose} <span>·</span> {medicine.frequency}</p><small className={medicine.stock <= 10 ? 'low-stock' : 'stock-count'}>{medicine.stock} tablets left</small></div>
          <span className={`status ${medicine.taken ? 'done' : ''}`}>{medicine.taken ? 'Taken' : 'Upcoming'}</span>
          <div className="medicine-actions"><button className={`take-button ${medicine.taken ? 'checked' : ''}`} onClick={() => toggleTaken(medicine.id)}>{medicine.taken ? '✓' : 'Take now'}</button><button className="icon-action" onClick={() => editMedicine(medicine)} aria-label={`Edit ${medicine.name}`}>✎</button><button className="icon-action delete-action" onClick={() => deleteMedicine(medicine.id)} aria-label={`Delete ${medicine.name}`}>×</button></div>
        </article>
      ))}
    </section>
  )

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => navigate('dashboard')}><span className="brand-mark">+</span><span>Medi<span>Mate</span></span></button>
        <nav className="main-nav">{navItems.map((item) => <button key={item.id} className={page === item.id ? 'nav-link active' : 'nav-link'} onClick={() => navigate(item.id)}><span className="nav-icon">{item.icon}</span>{item.label}</button>)}</nav>
        <div className="profile"><span className="avatar">AN</span><span className="profile-name">Anu</span></div>
      </header>

      <section className="page-content" id="top">
        <div className="welcome-row">
          <div><p className="eyebrow">{pageInfo[page].label}</p><h1>{pageInfo[page].title} {page === 'dashboard' && <span>✦</span>}</h1><p className="subcopy">{pageInfo[page].description}</p></div>
          {(page === 'dashboard' || page === 'medicines') && <button className="primary-button" onClick={() => navigate('add')}><span>＋</span> Add medicine</button>}
        </div>

        {page === 'add' && <section className="add-page"><form className="add-medicine-card" onSubmit={addMedicine}><div className="form-heading"><span className="form-symbol">✚</span><div><p className="eyebrow">{editingId === null ? 'NEW MEDICINE' : 'EDIT MEDICINE'}</p><h2>{editingId === null ? 'Add a medicine' : 'Edit medicine'}</h2><p>Enter the details below to keep your reminder accurate.</p></div></div><label>Medicine name<input autoFocus required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Vitamin C" /></label><div className="form-row"><label>Dosage<input required value={form.dose} onChange={(event) => setForm({ ...form, dose: event.target.value })} placeholder="e.g. 500 mg" /></label><label>Time<input type="time" required value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></label></div><label>Frequency<select value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value })}><option>Daily</option><option>After breakfast</option><option>After dinner</option><option>As needed</option></select></label><div className="form-actions"><button type="button" className="secondary-button" onClick={() => navigate('medicines')}>Cancel</button><button className="primary-button" type="submit">{editingId === null ? 'Save medicine' : 'Update medicine'}</button></div></form><aside className="add-side-card"><span>◷</span><p className="eyebrow">SMART REMINDER</p><h2>Never miss an important dose.</h2><p>Your medicine details are stored securely on this device and shown in your daily schedule.</p></aside></section>}

        {page === 'dashboard' && <>
          <section className="summary-grid">
            <article className="summary-card progress-card"><div className="card-label">TODAY'S PROGRESS</div><div className="progress-content"><div className="progress-ring" style={{ '--progress': `${medicines.length ? completed / medicines.length * 360 : 0}deg` } as React.CSSProperties}><strong>{completed}/{medicines.length}</strong><small>taken</small></div><div><h2>{completed === medicines.length ? 'All done!' : 'Keep going'}</h2><p>{medicines.length - completed} doses left for today</p></div></div></article>
            <article className="summary-card next-card"><div className="card-label">UP NEXT</div><div className="next-time">{nextMedicine?.time ?? '--:--'}</div><h2>{nextMedicine?.name ?? 'No reminders'}</h2><p>{nextMedicine?.dose ?? 'You are all caught up'}</p><span className="clock-icon">◷</span></article>
            <article className="summary-card refill-card"><div className="card-label">REFILL ALERT</div><div className="refill-icon">▥</div><h2>{medicines.filter((medicine) => medicine.stock <= 10).length} medicines</h2><p>Running low this week</p><button className="text-button" onClick={() => navigate('medicines')}>View list <span>→</span></button></article>
          </section>
          <div className="section-heading"><div><p className="eyebrow">YOUR SCHEDULE</p><h2>Today's reminders</h2></div><button className="date-button">‹ <span>Today, Sep 13</span> ›</button></div>
          {renderReminders(true)}
          <section className="dashboard-lower"><article className="weekly-card"><div className="lower-heading"><div><p className="eyebrow">THIS WEEK</p><h2>Adherence rhythm</h2></div><span className="trend-badge">{history.length ? `${Math.min(100, 70 + history.length * 3)}% on time` : 'Start today'}</span></div><div className="week-bars"><div><span style={{ height: '58%' }}/><small>Mon</small></div><div><span style={{ height: '74%' }}/><small>Tue</small></div><div><span style={{ height: '66%' }}/><small>Wed</small></div><div><span style={{ height: '86%' }}/><small>Thu</small></div><div><span style={{ height: '78%' }}/><small>Fri</small></div><div><span style={{ height: '94%' }}/><small>Sat</small></div><div className="today-bar"><span style={{ height: '82%' }}/><small>Today</small></div></div><p className="report-note">{history.length} dose actions recorded in your local report.</p></article><article className="tip-card"><span className="tip-icon">✦</span><p className="eyebrow">TODAY'S WELLNESS TIP</p><h2>Small routines create stronger days.</h2><p>Keep a glass of water beside your medicines so every dose becomes easier to remember.</p><button className="text-button" onClick={() => flash('Wellness tip saved')}>Save tip <span>♡</span></button></article></section>
        </>}

        {page === 'medicines' && <section className="inner-page"><div className="insight-strip"><div><span className="strip-icon">✦</span><strong>{medicines.length} active prescriptions</strong><p>Your routine is looking consistent this week.</p></div><button className="location-button" onClick={() => flash('Medicine history is up to date')}>View history →</button></div><div className="calendar-card"><div className="calendar-heading"><div><p className="eyebrow">SCHEDULE VIEW</p><h2>September 2026</h2></div><div className="calendar-toggle"><button className="active">Week</button><button onClick={() => flash('Daily calendar selected')}>Day</button></div></div><div className="calendar-days">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => <button className={index === 6 ? 'calendar-day today' : 'calendar-day'} key={day}><small>{day}</small><strong>{7 + index}</strong><span>{index === 6 ? medicines.length : index % 2 === 0 ? 2 : 1} doses</span></button>)}</div></div><div className="section-heading"><div><p className="eyebrow">ALL PRESCRIPTIONS</p><h2>Medicine schedule</h2></div><span className="page-count">{medicines.length} active</span></div><div className="medicine-toolbar"><div className="medicine-search"><span>⌕</span><input placeholder="Search medicines" onChange={(event) => setMedicineSearch(event.target.value)} /></div><div className="filter-tabs"><button className={medicineFilter === 'all' ? 'selected' : ''} onClick={() => setMedicineFilter('all')}>All</button><button className={medicineFilter === 'morning' ? 'selected' : ''} onClick={() => setMedicineFilter('morning')}>Morning</button><button className={medicineFilter === 'evening' ? 'selected' : ''} onClick={() => setMedicineFilter('evening')}>Later</button></div></div>{renderReminders(false, visibleMedicines.filter((medicine) => medicine.name.toLowerCase().includes(medicineSearch.toLowerCase())))}<div className="refill-banner"><span>▥</span><div><strong>Keep your cabinet ready</strong><p>{medicines.filter((medicine) => medicine.stock <= 10).length} medicines are running low. Stock is tracked on this device.</p></div><button onClick={() => flash('Refill reminder added')}>Remind me</button></div><div className="history-card"><div><p className="eyebrow">DOSE HISTORY</p><h2>Recent activity</h2></div>{history.length === 0 ? <p>No dose activity yet. Use Take medicine to start your report.</p> : <div className="history-list">{history.slice(0, 5).map((item) => <span key={item}>✓ {item}</span>)}</div>}</div></section>}

        {page === 'pharmacies' && <section className="pharmacy-page"><div className="pharmacy-hero"><div><p className="eyebrow">FIND CARE NEARBY</p><h2>Pharmacies around you</h2><p>Find trusted pharmacies and get your medicines when you need them.</p></div><button className="location-button" onClick={useLocation}>⌖ Use my location</button></div><div className="pharmacy-layout"><div className="map-panel"><div className="map-grid"><span className="map-road road-one"/><span className="map-road road-two"/><span className="map-road road-three"/><span className="map-pin pin-one">✚</span><span className="map-pin pin-two">✚</span><span className="map-pin pin-three">✚</span><span className="you-are-here">You are here</span></div></div><div className="pharmacy-results"><div className="search-box"><span>⌕</span><input value={pharmacySearch} onChange={(event) => setPharmacySearch(event.target.value)} placeholder="Search by name or area" /></div>{filteredPharmacies.map((pharmacy) => <article className="pharmacy-row" key={pharmacy.name}><div className="pharmacy-icon">✚</div><div className="pharmacy-info"><h3>{pharmacy.name}</h3><p>{pharmacy.area}</p><small><span className="open-dot"/> {pharmacy.open}</small></div><div className="pharmacy-distance"><strong>{pharmacy.distance}</strong><a href={`tel:${pharmacy.phone}`}>Call</a><a className="direction-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${pharmacy.name} ${pharmacy.area}`)}`} target="_blank" rel="noreferrer">Directions</a></div></article>)}</div></div><div className="service-strip"><p className="eyebrow">PHARMACY SERVICES</p><div><button onClick={() => flash('Prescription upload selected')}>▧ Upload prescription</button><button onClick={() => flash('Delivery options selected')}>⌁ Home delivery</button><button onClick={() => flash('Pharmacist chat selected')}>♡ Ask a pharmacist</button></div></div></section>}

        {page === 'reminder' && <section className="reminder-page"><div className="reminder-focus"><div className="focus-orb">◷</div><p className="eyebrow">YOUR NEXT DOSE</p><h2>{nextMedicine?.name ?? 'No pending medicine'}</h2><div className="focus-time">{nextMedicine?.time ?? '--:--'} <small>{nextMedicine && (nextMedicine.time < '12:00' ? 'AM' : 'PM')}</small></div><p className="focus-dose">{nextMedicine?.dose ?? 'Add a medicine to create a reminder'} <span>·</span> {nextMedicine?.frequency ?? 'Daily routine'}</p><div className="reminder-actions"><button className="primary-button" onClick={() => nextMedicine && toggleTaken(nextMedicine.id)}>✓ Take medicine</button><button className="secondary-button" onClick={skipMedicine}>Skip for now</button></div></div><div className="reminder-side"><p className="eyebrow">REMINDER ROUTINE</p><h2>Stay consistent, feel confident.</h2><p>Taking medicines at a regular time helps you build a routine that is easier to follow.</p><div className="routine-row"><span>✓</span><div><strong>Morning check</strong><small>Vitamin D3 completed</small></div></div><div className="routine-row"><span>◷</span><div><strong>Next up</strong><small>{nextMedicine?.name ?? 'No upcoming medicine'}</small></div></div><button className="location-button" onClick={enableNotifications}>{notificationsEnabled ? '✓ Notifications enabled' : '♧ Enable notifications'}</button><button className="location-button" onClick={() => navigate('medicines')}>View all medicines →</button><div className="care-contact"><p className="eyebrow">CARE TEAM</p><strong>Dr. Meera Krishnan</strong><small>Sunrise Family Clinic · +91 98765 43210</small><a href="tel:+919876543210">Call doctor</a></div><div className="care-contact emergency"><p className="eyebrow">EMERGENCY CONTACT</p><strong>Priya · Sister</strong><small>Available for urgent support</small><a href="tel:+919876501234">Call emergency contact</a></div></div></section>}
      </section>

      <footer className="footer"><span>Made for better everyday health</span><span>All your data stays on this device <b>·</b> <a href="#privacy">Privacy</a></span></footer>

      {showForm && <div className="modal-backdrop" onClick={() => setShowForm(false)}><form className="modal" onSubmit={addMedicine} onClick={(event) => event.stopPropagation()}><button type="button" className="close-button" onClick={() => setShowForm(false)}>×</button><p className="eyebrow">NEW REMINDER</p><h2>Add a medicine</h2><p className="modal-copy">We'll remind you at the right time.</p><label>Medicine name<input autoFocus required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Vitamin C" /></label><div className="form-row"><label>Dosage<input required value={form.dose} onChange={(event) => setForm({ ...form, dose: event.target.value })} placeholder="e.g. 500 mg" /></label><label>Time<input type="time" required value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></label></div><label>Frequency<select value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value })}><option>Daily</option><option>After breakfast</option><option>After dinner</option><option>As needed</option></select></label><button className="primary-button full-width" type="submit">Save reminder</button></form></div>}
      {notice && <div className="toast">✓ {notice}</div>}
    </main>
  )
}

export default App
