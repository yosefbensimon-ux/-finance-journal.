import { useState, useEffect, useMemo } from "react";
import {
  Plus, Minus, Search, CalendarPlus, BarChart3,
  X, ChevronRight, ChevronLeft, Paperclip, Trash2, ChevronDown,
  Users, ArrowUpDown, Pencil, Bell, LogOut, Copy, Landmark, Clock, DollarSign, Cloud, Home, Printer, Save,
  Receipt, StickyNote, LayoutGrid, TrendingUp, TrendingDown, Calculator, Delete, Table2, FileDown, Filter
} from "lucide-react";
import { supabase } from "./supabaseClient";

const DEFAULT_CATEGORIES = [
  { id: "work_income", label: "הכנסות עבודה", color: "#33B679", kind: "income" },
  { id: "work_expense", label: "הוצאות עבודה", color: "#E67C73", kind: "expense" },
  { id: "loans", label: "הלוואות", color: "#F6BF26", kind: "expense" },
  { id: "arrangements", label: "הסדרים", color: "#8E24AA", kind: "expense" },
  { id: "misc", label: "שונות", color: "#616161", kind: "expense" },
];

const PAYMENT_METHODS = ["מזומן", "צ'ק", "העברה בנקאית", "אשראי", "הוראת קבע", "ביט"];
const STATUSES = ["שולם", "ממתין", "דחוי", "בוטל"];
const VIEW_MODES = ["יומי", "שבועי", "חודשי", "שנתי"];
const PARTY_TYPES = [
  { id: "client", label: "לקוח", color: "#4A6FA5" },
  { id: "supplier", label: "ספק", color: "#B85C4A" },
  { id: "subcontractor", label: "קבלן משנה", color: "#A6763E" },
  { id: "employee", label: "עובד", color: "#5B8C6E" },
];
const PARTY_FILTER_OPTIONS = [{ id: "all", label: "הכל" }, ...PARTY_TYPES];
const REPEAT_OPTIONS = [
  { id: "none", label: "ללא חזרה" }, { id: "daily", label: "כל יום" }, { id: "weekly", label: "כל שבוע" },
  { id: "monthly", label: "כל חודש" }, { id: "yearly", label: "כל שנה" },
];
const SNOOZE_OPTIONS = [
  { id: "none", label: "בלי נודניק" }, { id: "5", label: "נודניק כל 5 דקות" }, { id: "10", label: "נודניק כל 10 דקות" },
  { id: "30", label: "נודניק כל 30 דקות" }, { id: "60", label: "נודניק כל שעה" },
];
const REMINDER_STATUSES = [
  { id: "ongoing", label: "נמשך", color: "#1E8E5A" },
  { id: "paused", label: "לא נמשך", color: "#C7920C" },
  { id: "cancelled", label: "מבוטל", color: "#C5453D" },
];
const INVOICE_STATUSES = ["ממתינה", "שולמה", "בוטלה"];
function reminderStatusMeta(id) { return REMINDER_STATUSES.find((s) => s.id === id) || REMINDER_STATUSES[0]; }
function entryStatusColor(status) {
  if (status === "שולם") return "#1E8E5A";
  if (status === "בוטל") return "#C5453D";
  return "#C7920C";
}
const ACCENT = "#2E5BFF";
const NAVY = "#101B33";
const NAVY2 = "#16223F";
const INK = "#101B33";
const SLATE = "#5B6472";
const GREEN = "#1FA25A";
const RED = "#E5484D";

function uid(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function formatILS(n) {
  const sign = n < 0 ? "-" : "";
  return sign + new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(Math.abs(n));
}
function partyTypeMeta(id) { return PARTY_TYPES.find((p) => p.id === id) || PARTY_TYPES[0]; }
function startOfWeek(d) { const date = new Date(d); date.setDate(date.getDate() - date.getDay()); date.setHours(0, 0, 0, 0); return date; }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addDays(d, n) { const date = new Date(d); date.setDate(date.getDate() + n); return date; }
function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function iso(d) { return d.toISOString().slice(0, 10); }
function fmtShort(d) { return new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short" }).format(d); }
function periodWordFor(mode) {
  if (mode === "יומי") return "היום";
  if (mode === "חודשי") return "החודש";
  if (mode === "שנתי") return "השנה";
  return "השבוע";
}
function noEntriesMessage(mode) {
  if (mode === "יומי") return "אין תנועות היום.";
  if (mode === "חודשי") return "אין תנועות החודש.";
  if (mode === "שנתי") return "אין תנועות השנה.";
  return "אין תנועות השבוע.";
}
function weatherInfo(code) {
  if (code === 0) return { label: "בהיר", emoji: "☀️" };
  if (code === 1 || code === 2) return { label: "מעונן חלקית", emoji: "⛅" };
  if (code === 3) return { label: "מעונן", emoji: "☁️" };
  if (code === 45 || code === 48) return { label: "ערפילי", emoji: "🌫️" };
  if (code >= 51 && code <= 57) return { label: "טפטוף", emoji: "🌦️" };
  if (code >= 61 && code <= 67) return { label: "גשום", emoji: "🌧️" };
  if (code >= 71 && code <= 77) return { label: "שלג", emoji: "❄️" };
  if (code >= 80 && code <= 82) return { label: "ממטרים", emoji: "🌦️" };
  if (code >= 95) return { label: "סופת רעמים", emoji: "⛈️" };
  return { label: "מזג אוויר", emoji: "🌡️" };
}
function pctChange(curr, prev) {
  if (!prev) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}
const DAY_LABELS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

const emptyForm = {
  type: "expense", amount: "", valueDate: todayISO(), actualDate: "", paymentMethod: "העברה בנקאית",
  checkNumber: "", bankBranch: "", refNumber: "", partyId: "", partyName: "", partyType: "client",
  category: "misc", subCategory: "", project: "", status: "שולם", recurring: "חד־פעמי",
  installmentNum: "", installmentTotal: "", notes: "", tags: "",
  bankReconciled: false, reconciliationDate: "",
};
const emptyParty = { name: "", type: "client", phone: "", idNumber: "", email: "", address: "", notes: "" };
const emptyReminder = { title: "", date: todayISO(), time: "09:00", repeat: "none", snooze: "none", notes: "", status: "ongoing" };
const emptyInvoice = { number: "", partyName: "", amount: "", date: todayISO(), status: "ממתינה", notes: "" };

function entryToRow(e, userId) {
  return {
    user_id: userId, type: e.type, amount: e.amount, value_date: e.valueDate, actual_date: e.actualDate || null,
    payment_method: e.paymentMethod, check_number: e.checkNumber || null, bank_branch: e.bankBranch || null,
    ref_number: e.refNumber || null, party_id: e.partyId || null, party_name: e.partyName || null,
    party_type: e.partyType || null, category: e.category, sub_category: e.subCategory || null,
    project: e.project || null, status: e.status, recurring: e.recurring,
    installment_num: e.installmentNum ? Number(e.installmentNum) : null,
    installment_total: e.installmentTotal ? Number(e.installmentTotal) : null,
    notes: e.notes || null, tags: e.tags || null,
    bank_reconciled: e.bankReconciled || false, reconciliation_date: e.reconciliationDate || null,
  };
}
function rowToEntry(r) {
  return {
    id: r.id, type: r.type, amount: Number(r.amount), valueDate: r.value_date, actualDate: r.actual_date || "",
    paymentMethod: r.payment_method || "", checkNumber: r.check_number || "", bankBranch: r.bank_branch || "",
    refNumber: r.ref_number || "", partyId: r.party_id || "", partyName: r.party_name || "", partyType: r.party_type || "",
    category: r.category, subCategory: r.sub_category || "", project: r.project || "", status: r.status || "",
    recurring: r.recurring || "", installmentNum: r.installment_num || "", installmentTotal: r.installment_total || "",
    notes: r.notes || "", tags: r.tags || "",
    bankReconciled: r.bank_reconciled || false, reconciliationDate: r.reconciliation_date || "",
  };
}
function partyToRow(p, userId) {
  return { user_id: userId, name: p.name, type: p.type, phone: p.phone || null, id_number: p.idNumber || null, email: p.email || null, address: p.address || null, notes: p.notes || null };
}
function rowToParty(r) {
  return { id: r.id, name: r.name, type: r.type, phone: r.phone || "", idNumber: r.id_number || "", email: r.email || "", address: r.address || "", notes: r.notes || "" };
}
function reminderToRow(r, userId) {
  return { user_id: userId, title: r.title, date: r.date, time: r.time, repeat: r.repeat, snooze: r.snooze, notes: r.notes || null, status: r.status || "ongoing" };
}
function rowToReminder(r) {
  return { id: r.id, title: r.title, date: r.date, time: r.time || "", repeat: r.repeat || "none", snooze: r.snooze || "none", notes: r.notes || "", status: r.status || "ongoing" };
}
function invoiceToRow(v, userId) {
  return { user_id: userId, number: v.number || null, party_name: v.partyName, amount: Number(v.amount), date: v.date, status: v.status, notes: v.notes || null };
}
function rowToInvoice(r) {
  return { id: r.id, number: r.number || "", partyName: r.party_name, amount: Number(r.amount), date: r.date, status: r.status, notes: r.notes || "" };
}
function noteToRow(text, userId) { return { user_id: userId, text }; }
function rowToNote(r) { return { id: r.id, text: r.text, createdAt: r.created_at }; }

function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-label="לוגו">
      <defs>
        <linearGradient id="logoSplit" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2E5BFF" />
          <stop offset="0.52" stopColor="#2E5BFF" />
          <stop offset="0.52" stopColor="#1B3FCC" />
          <stop offset="1" stopColor="#1B3FCC" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#logoSplit)" />
      <text x="20" y="26" textAnchor="middle" fontFamily="'Frank Ruhl Libre', Georgia, serif" fontWeight="700" fontSize="20" fill="#fff">₪</text>
      <rect x="10" y="30" width="20" height="2" rx="1" fill="#fff" opacity="0.85" />
    </svg>
  );
}

export default function FinanceJournal({ session }) {
  const userId = session.user.id;
  const [entries, setEntries] = useState([]);
  const [parties, setParties] = useState([]);
  const categories = DEFAULT_CATEGORIES;
  const [loaded, setLoaded] = useState(false);
  const [usdRate, setUsdRate] = useState(null);
  const [weather, setWeather] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [partyQuery, setPartyQuery] = useState("");
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);

  const [showPartyManager, setShowPartyManager] = useState(false);
  const [partyForm, setPartyForm] = useState(emptyParty);
  const [editingPartyId, setEditingPartyId] = useState(null);
  const [managerTypeFilter, setManagerTypeFilter] = useState("all");

  const [showReport, setShowReport] = useState(false);
  const [reportGroupByType, setReportGroupByType] = useState(true);

  const [reminders, setReminders] = useState([]);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState(null);
  const [reminderForm, setReminderForm] = useState(emptyReminder);

  const [invoices, setInvoices] = useState([]);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoice);
  const [showInvoiceList, setShowInvoiceList] = useState(false);

  const [notes, setNotes] = useState([]);
  const [noteInput, setNoteInput] = useState("");

  const [showChecksDb, setShowChecksDb] = useState(false);
  const [checksSort, setChecksSort] = useState({ key: "valueDate", dir: "desc" });
  const [checksFilters, setChecksFilters] = useState({});

  const [calcDisplay, setCalcDisplay] = useState("0");
  const [calcPrev, setCalcPrev] = useState(null);
  const [calcOp, setCalcOp] = useState(null);
  const [calcReset, setCalcReset] = useState(false);

  const [contextMenu, setContextMenu] = useState(null);

  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [monthCursor, setMonthCursor] = useState(startOfMonth(new Date()));
  const [yearCursor, setYearCursor] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState("חודשי");
  const [partyFilter, setPartyFilter] = useState("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [fabOpen, setFabOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [history, setHistory] = useState([]);
  const [showHomeMenu, setShowHomeMenu] = useState(false);
  const [savedConfirm, setSavedConfirm] = useState(false);
  const [showDeletedHistory, setShowDeletedHistory] = useState(false);
  const [deletedItems, setDeletedItems] = useState([]);
  const [deletedLoading, setDeletedLoading] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch("https://api.frankfurter.app/latest?from=USD&to=ILS")
      .then((r) => r.json())
      .then((d) => { if (d?.rates?.ILS) setUsdRate(d.rates.ILS); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function fetchWeather(lat, lon, cityLabel) {
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`)
        .then((r) => r.json())
        .then((d) => { if (d?.current_weather) setWeather({ temp: d.current_weather.temperature, code: d.current_weather.weathercode, cityLabel }); })
        .catch(() => {});
    }
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude, "המיקום שלך"),
        () => fetchWeather(32.0853, 34.7818, "תל אביב"),
        { timeout: 5000 }
      );
    } else fetchWeather(32.0853, 34.7818, "תל אביב");
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [entriesRes, partiesRes, remindersRes, invoicesRes, notesRes] = await Promise.all([
          supabase.from("entries").select("*").eq("user_id", userId).is("deleted_at", null).order("value_date", { ascending: false }),
          supabase.from("parties").select("*").eq("user_id", userId).is("deleted_at", null),
          supabase.from("reminders").select("*").eq("user_id", userId).is("deleted_at", null),
          supabase.from("invoices").select("*").eq("user_id", userId).is("deleted_at", null).order("date", { ascending: false }),
          supabase.from("notes").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        ]);
        if (entriesRes.error) throw entriesRes.error;
        if (partiesRes.error) throw partiesRes.error;
        if (remindersRes.error) throw remindersRes.error;
        setEntries((entriesRes.data || []).map(rowToEntry));
        setParties((partiesRes.data || []).map(rowToParty));
        setReminders((remindersRes.data || []).map(rowToReminder));
        if (!invoicesRes.error) setInvoices((invoicesRes.data || []).map(rowToInvoice));
        if (!notesRes.error) setNotes((notesRes.data || []).map(rowToNote));
      } catch (e) {
        setError(e.message || "שגיאה בטעינת נתונים");
      } finally {
        setLoaded(true);
      }
    })();
  }, [userId]);

  function pushHistory(entry) {
    setHistory((prev) => [{ id: uid("h"), time: new Date(), ...entry }, ...prev].slice(0, 10));
  }

  async function addEntry(formData, opts = {}) {
    const { data, error } = await supabase.from("entries").insert(entryToRow(formData, userId)).select().single();
    if (error) { setError(error.message); return false; }
    const created = rowToEntry(data);
    setEntries((prev) => [created, ...prev]);
    setError("");
    if (opts.trackHistory !== false) pushHistory({ kind: "entry", action: "add", label: `הוספת ${formData.type === "income" ? "הכנסה" : "הוצאה"}${formData.partyName ? " · " + formData.partyName : ""}`, before: null, after: created });
    return true;
  }
  async function updateEntry(id, formData, opts = {}) {
    const beforeItem = entries.find((e) => e.id === id);
    const { data, error } = await supabase.from("entries").update(entryToRow(formData, userId)).eq("id", id).select().single();
    if (error) { setError(error.message); return false; }
    const updated = rowToEntry(data);
    setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    setError("");
    if (opts.trackHistory !== false && beforeItem) pushHistory({ kind: "entry", action: "edit", label: `עריכת תנועה${updated.partyName ? " · " + updated.partyName : ""}`, before: beforeItem, after: updated });
    return true;
  }
  async function deleteEntry(id, opts = {}) {
    const prev = entries;
    const deletedItem = entries.find((e) => e.id === id);
    setEntries(entries.filter((e) => e.id !== id));
    const { error } = await supabase.from("entries").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) { setError(error.message); setEntries(prev); return; }
    if (editingEntryId === id) { setShowForm(false); setEditingEntryId(null); }
    if (deletedItem && opts.trackHistory !== false) pushHistory({ kind: "entry", action: "delete", label: `מחיקת תנועה${deletedItem.partyName ? " · " + deletedItem.partyName : ""}`, before: deletedItem, after: null });
  }
  function duplicateEntry(entry) { const copy = { ...entry }; delete copy.id; addEntry(copy); jumpToDate(new Date(copy.valueDate + "T12:00:00")); }

  async function addParty(p, opts = {}) {
    const { data, error } = await supabase.from("parties").insert(partyToRow(p, userId)).select().single();
    if (error) { setError(error.message); return null; }
    const created = rowToParty(data);
    setParties((prev) => [created, ...prev]);
    if (opts.trackHistory !== false) pushHistory({ kind: "party", action: "add", label: `הוספת ${partyTypeMeta(p.type).label} · ${p.name}`, before: null, after: created });
    return created;
  }
  async function updateParty(id, p, opts = {}) {
    const beforeItem = parties.find((x) => x.id === id);
    const { data, error } = await supabase.from("parties").update(partyToRow(p, userId)).eq("id", id).select().single();
    if (error) { setError(error.message); return; }
    const updated = rowToParty(data);
    setParties((prev) => prev.map((x) => (x.id === id ? updated : x)));
    if (opts.trackHistory !== false && beforeItem) pushHistory({ kind: "party", action: "edit", label: `עריכת ${partyTypeMeta(updated.type).label} · ${updated.name}`, before: beforeItem, after: updated });
  }
  async function deleteParty(id, opts = {}) {
    const prev = parties;
    const deletedItem = parties.find((p) => p.id === id);
    setParties(parties.filter((p) => p.id !== id));
    const { error } = await supabase.from("parties").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) { setError(error.message); setParties(prev); return; }
    if (deletedItem && opts.trackHistory !== false) pushHistory({ kind: "party", action: "delete", label: `מחיקת ${partyTypeMeta(deletedItem.type).label} · ${deletedItem.name}`, before: deletedItem, after: null });
  }

  async function addReminder(r, opts = {}) {
    const { data, error } = await supabase.from("reminders").insert(reminderToRow(r, userId)).select().single();
    if (error) { setError(error.message); return false; }
    const created = rowToReminder(data);
    setReminders((prev) => [created, ...prev]);
    setError("");
    if (opts.trackHistory !== false) pushHistory({ kind: "reminder", action: "add", label: `הוספת תזכורת · ${r.title}`, before: null, after: created });
    return true;
  }
  async function updateReminder(id, r, opts = {}) {
    const beforeItem = reminders.find((x) => x.id === id);
    const { data, error } = await supabase.from("reminders").update(reminderToRow(r, userId)).eq("id", id).select().single();
    if (error) { setError(error.message); return false; }
    const updated = rowToReminder(data);
    setReminders((prev) => prev.map((x) => (x.id === id ? updated : x)));
    setError("");
    if (opts.trackHistory !== false && beforeItem) pushHistory({ kind: "reminder", action: "edit", label: `עריכת תזכורת · ${updated.title}`, before: beforeItem, after: updated });
    return true;
  }
  async function deleteReminder(id, opts = {}) {
    const prev = reminders;
    const deletedItem = reminders.find((r) => r.id === id);
    setReminders(reminders.filter((r) => r.id !== id));
    const { error } = await supabase.from("reminders").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) { setError(error.message); setReminders(prev); return; }
    if (editingReminderId === id) { setShowReminderForm(false); setEditingReminderId(null); }
    if (deletedItem && opts.trackHistory !== false) pushHistory({ kind: "reminder", action: "delete", label: `מחיקת תזכורת · ${deletedItem.title}`, before: deletedItem, after: null });
  }
  function duplicateReminder(reminder) { const copy = { ...reminder }; delete copy.id; addReminder(copy); jumpToDate(new Date(copy.date + "T12:00:00")); }
  function markReminderStatus(reminder, status) { updateReminder(reminder.id, { ...reminder, status }); }

  async function addInvoice(v, opts = {}) {
    const { data, error } = await supabase.from("invoices").insert(invoiceToRow(v, userId)).select().single();
    if (error) { setError(error.message); return false; }
    const created = rowToInvoice(data);
    setInvoices((prev) => [created, ...prev]);
    setError("");
    if (opts.trackHistory !== false) pushHistory({ kind: "invoice", action: "add", label: `הוספת חשבונית · ${v.partyName}`, before: null, after: created });
    return true;
  }
  async function updateInvoice(id, v, opts = {}) {
    const beforeItem = invoices.find((x) => x.id === id);
    const { data, error } = await supabase.from("invoices").update(invoiceToRow(v, userId)).eq("id", id).select().single();
    if (error) { setError(error.message); return false; }
    const updated = rowToInvoice(data);
    setInvoices((prev) => prev.map((x) => (x.id === id ? updated : x)));
    if (opts.trackHistory !== false && beforeItem) pushHistory({ kind: "invoice", action: "edit", label: `עריכת חשבונית · ${updated.partyName}`, before: beforeItem, after: updated });
    return true;
  }
  async function deleteInvoice(id, opts = {}) {
    const prev = invoices;
    const deletedItem = invoices.find((v) => v.id === id);
    setInvoices(invoices.filter((v) => v.id !== id));
    const { error } = await supabase.from("invoices").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) { setError(error.message); setInvoices(prev); return; }
    if (editingInvoiceId === id) { setShowInvoiceForm(false); setEditingInvoiceId(null); }
    if (deletedItem && opts.trackHistory !== false) pushHistory({ kind: "invoice", action: "delete", label: `מחיקת חשבונית · ${deletedItem.partyName}`, before: deletedItem, after: null });
  }
  function openInvoiceForm() { setEditingInvoiceId(null); setInvoiceForm(emptyInvoice); setShowInvoiceForm(true); setFabOpen(false); }
  function openEditInvoiceForm(v) { setEditingInvoiceId(v.id); setInvoiceForm({ number: v.number, partyName: v.partyName, amount: String(v.amount), date: v.date, status: v.status, notes: v.notes }); setShowInvoiceForm(true); }
  async function submitInvoice() {
    if (!invoiceForm.partyName.trim() || !invoiceForm.amount) { setError("מלא שם ולקוח וסכום"); return; }
    const ok = editingInvoiceId ? await updateInvoice(editingInvoiceId, invoiceForm) : await addInvoice(invoiceForm);
    if (!ok) return;
    setShowInvoiceForm(false);
    setEditingInvoiceId(null);
  }

  async function addNote() {
    if (!noteInput.trim()) return;
    const { data, error } = await supabase.from("notes").insert(noteToRow(noteInput.trim(), userId)).select().single();
    if (error) { setError(error.message); return; }
    setNotes((prev) => [rowToNote(data), ...prev]);
    setNoteInput("");
  }
  async function deleteNote(id) {
    const prev = notes;
    setNotes(notes.filter((n) => n.id !== id));
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) { setError(error.message); setNotes(prev); }
  }

  async function restoreById(kind, id) {
    const table = kind === "entry" ? "entries" : kind === "reminder" ? "reminders" : kind === "party" ? "parties" : "invoices";
    const { data, error } = await supabase.from(table).update({ deleted_at: null }).eq("id", id).select().single();
    if (error) { setError(error.message); return false; }
    if (kind === "entry") setEntries((prev) => [rowToEntry(data), ...prev]);
    else if (kind === "reminder") setReminders((prev) => [rowToReminder(data), ...prev]);
    else if (kind === "party") setParties((prev) => [rowToParty(data), ...prev]);
    else if (kind === "invoice") setInvoices((prev) => [rowToInvoice(data), ...prev]);
    return true;
  }
  async function loadDeletedItems() {
    setDeletedLoading(true);
    try {
      const [e, r, p, v] = await Promise.all([
        supabase.from("entries").select("*").eq("user_id", userId).not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
        supabase.from("reminders").select("*").eq("user_id", userId).not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
        supabase.from("parties").select("*").eq("user_id", userId).not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
        supabase.from("invoices").select("*").eq("user_id", userId).not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
      ]);
      const combined = [
        ...(e.data || []).map((row) => ({ kind: "entry", id: row.id, deletedAt: row.deleted_at, label: `${row.type === "income" ? "הכנסה" : "הוצאה"} · ${row.party_name || catById(row.category).label} · ${formatILS(Number(row.amount))}` })),
        ...(r.data || []).map((row) => ({ kind: "reminder", id: row.id, deletedAt: row.deleted_at, label: `תזכורת · ${row.title}` })),
        ...(p.data || []).map((row) => ({ kind: "party", id: row.id, deletedAt: row.deleted_at, label: `${partyTypeMeta(row.type).label} · ${row.name}` })),
        ...(v.data || []).map((row) => ({ kind: "invoice", id: row.id, deletedAt: row.deleted_at, label: `חשבונית · ${row.party_name}` })),
      ];
      combined.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
      setDeletedItems(combined);
    } catch (e) {
      setError(e.message || "שגיאה בטעינת היסטוריה");
    } finally {
      setDeletedLoading(false);
    }
  }
  async function restoreDeletedItem(item) {
    const ok = await restoreById(item.kind, item.id);
    if (ok) setDeletedItems((prev) => prev.filter((x) => x.id !== item.id));
  }
  function openDeletedHistory() { setShowDeletedHistory(true); loadDeletedItems(); }

  async function undoHistoryEntry(entryId) {
    const entry = history.find((h) => h.id === entryId);
    if (!entry) return;
    setHistory((prev) => prev.filter((h) => h.id !== entryId));
    const { kind, action, before, after } = entry;
    const opts = { trackHistory: false };
    if (action === "delete") { await restoreById(kind, before.id); return; }
    if (kind === "entry") {
      if (action === "add") await deleteEntry(after.id, opts);
      else if (action === "edit") await updateEntry(after.id, before, opts);
    } else if (kind === "reminder") {
      if (action === "add") await deleteReminder(after.id, opts);
      else if (action === "edit") await updateReminder(after.id, before, opts);
    } else if (kind === "party") {
      if (action === "add") await deleteParty(after.id, opts);
      else if (action === "edit") await updateParty(after.id, before, opts);
    } else if (kind === "invoice") {
      if (action === "add") await deleteInvoice(after.id, opts);
      else if (action === "edit") await updateInvoice(after.id, before, opts);
    }
  }
  function handlePrint() { window.print(); }
  function handleSaveConfirm() { setSavedConfirm(true); setTimeout(() => setSavedConfirm(false), 2000); }

  function catById(id) { return categories.find((c) => c.id === id) || categories[categories.length - 1]; }

  function openForm(type) {
    setEditingEntryId(null);
    setForm({ ...emptyForm, type, category: type === "income" ? "work_income" : "misc" });
    setPartyQuery(""); setShowMore(false); setError(""); setShowForm(true); setFabOpen(false);
  }
  function openEditForm(entry) {
    setEditingEntryId(entry.id);
    setForm({
      type: entry.type, amount: String(Math.abs(entry.amount)), valueDate: entry.valueDate, actualDate: entry.actualDate || "",
      paymentMethod: entry.paymentMethod || "העברה בנקאית", checkNumber: entry.checkNumber || "", bankBranch: entry.bankBranch || "",
      refNumber: entry.refNumber || "", partyId: entry.partyId || "", partyName: entry.partyName || "", partyType: entry.partyType || "client",
      category: entry.category, subCategory: entry.subCategory || "", project: entry.project || "", status: entry.status || "שולם",
      recurring: entry.recurring || "חד־פעמי", installmentNum: entry.installmentNum || "", installmentTotal: entry.installmentTotal || "",
      notes: entry.notes || "", tags: entry.tags || "",
      bankReconciled: entry.bankReconciled || false, reconciliationDate: entry.reconciliationDate || "",
    });
    setPartyQuery(entry.partyName || "");
    setShowMore(true); setError(""); setShowForm(true); setFabOpen(false);
  }
  function closeForm() { setShowForm(false); setEditingEntryId(null); }
  async function submitForm() {
    const val = parseFloat(form.amount);
    if (!val || val <= 0) { setError("הכנס סכום תקין"); return; }
    if (!form.valueDate) { setError("בחר תאריך"); return; }
    const signed = { ...form, amount: form.type === "expense" ? -Math.abs(val) : Math.abs(val) };
    const ok = editingEntryId ? await updateEntry(editingEntryId, signed) : await addEntry(signed);
    if (!ok) return;
    jumpToDate(new Date(form.valueDate + "T12:00:00"));
    setShowForm(false);
    setEditingEntryId(null);
  }

  const partyMatches = useMemo(() => {
    if (!partyQuery.trim()) return parties;
    const q = partyQuery.trim().toLowerCase();
    return parties.filter((p) => p.name.toLowerCase().includes(q));
  }, [parties, partyQuery]);

  function pickParty(p) { setForm({ ...form, partyId: p.id, partyName: p.name, partyType: p.type }); setPartyQuery(p.name); setShowPartyDropdown(false); }
  async function quickAddParty() {
    const name = partyQuery.trim(); if (!name) return;
    const created = await addParty({ ...emptyParty, name, type: form.partyType || "client" });
    if (created) pickParty(created);
  }
  function startEditParty(p) { setEditingPartyId(p.id); setPartyForm({ name: p.name, type: p.type, phone: p.phone || "", idNumber: p.idNumber || "", email: p.email || "", address: p.address || "", notes: p.notes || "" }); }
  function startNewParty() { setShowPartyManager(true); setEditingPartyId("new"); setPartyForm(emptyParty); setFabOpen(false); }
  async function saveParty() {
    if (!partyForm.name.trim()) return;
    if (editingPartyId === "new") await addParty(partyForm);
    else await updateParty(editingPartyId, partyForm);
    setEditingPartyId(null);
  }

  const managerFiltered = useMemo(() => {
    let list = parties;
    if (managerTypeFilter !== "all") list = list.filter((p) => p.type === managerTypeFilter);
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "he"));
  }, [parties, managerTypeFilter]);

  function openReminderForm() { setEditingReminderId(null); setReminderForm(emptyReminder); setShowReminderForm(true); setFabOpen(false); }
  function openEditReminderForm(r) {
    setEditingReminderId(r.id);
    setReminderForm({ title: r.title, date: r.date, time: r.time || "09:00", repeat: r.repeat || "none", snooze: r.snooze || "none", notes: r.notes || "", status: r.status || "ongoing" });
    setError(""); setShowReminderForm(true); setFabOpen(false);
  }
  function closeReminderForm() { setShowReminderForm(false); setEditingReminderId(null); }
  async function saveReminder() {
    if (!reminderForm.title.trim() || !reminderForm.date) { setError("מלא כותרת ותאריך"); return; }
    const ok = editingReminderId ? await updateReminder(editingReminderId, reminderForm) : await addReminder(reminderForm);
    if (!ok) return;
    jumpToDate(new Date(reminderForm.date + "T12:00:00"));
    setShowReminderForm(false);
    setEditingReminderId(null);
  }

  function openContextMenu(ev, kind, item) {
    ev.preventDefault();
    const menuW = 160, menuH = kind === "reminder" ? 240 : 130;
    let x = ev.clientX, y = ev.clientY;
    if (typeof window !== "undefined") {
      if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 8;
      if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 8;
    }
    setContextMenu({ x, y, kind, item });
  }
  function closeContextMenu() { setContextMenu(null); }
  function handleMenuEdit() {
    if (!contextMenu) return;
    if (contextMenu.kind === "entry") openEditForm(contextMenu.item);
    else openEditReminderForm(contextMenu.item);
    closeContextMenu();
  }
  function handleMenuDuplicate() {
    if (!contextMenu) return;
    if (contextMenu.kind === "entry") duplicateEntry(contextMenu.item);
    else duplicateReminder(contextMenu.item);
    closeContextMenu();
  }
  function handleMenuDelete() {
    if (!contextMenu) return;
    if (contextMenu.kind === "entry") deleteEntry(contextMenu.item.id);
    else deleteReminder(contextMenu.item.id);
    closeContextMenu();
  }

  const weekStart = useMemo(() => startOfWeek(weekAnchor), [weekAnchor]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const filteredEntries = useMemo(() => {
    let list = entries;
    if (partyFilter !== "all") list = list.filter((e) => e.partyType === partyFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((e) => [e.partyName, e.notes, e.project, e.subCategory, e.tags].filter(Boolean).some((f) => f.toLowerCase().includes(q)));
    }
    return list;
  }, [entries, partyFilter, searchQuery]);

  const weekEntries = useMemo(() => {
    const s = iso(weekStart), en = iso(addDays(weekStart, 6));
    return filteredEntries.filter((e) => e.valueDate >= s && e.valueDate <= en);
  }, [filteredEntries, weekStart]);

  const entriesByDay = useMemo(() => {
    const map = {}; for (const d of weekDays) map[iso(d)] = [];
    for (const e of weekEntries) if (map[e.valueDate]) map[e.valueDate].push(e);
    return map;
  }, [weekEntries, weekDays]);

  const remindersByDay = useMemo(() => {
    const map = {}; for (const d of weekDays) map[iso(d)] = [];
    for (const r of reminders) if (map[r.date]) map[r.date].push(r);
    for (const k in map) map[k].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    return map;
  }, [reminders, weekDays]);

  const periodRange = useMemo(() => {
    if (viewMode === "יומי") {
      const s = iso(weekAnchor);
      return { start: s, end: s, label: new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", year: "numeric" }).format(weekAnchor) };
    }
    if (viewMode === "חודשי") {
      const s = iso(startOfMonth(monthCursor));
      const endD = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);
      return { start: s, end: iso(endD), label: new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(monthCursor) };
    }
    if (viewMode === "שנתי") return { start: `${yearCursor}-01-01`, end: `${yearCursor}-12-31`, label: String(yearCursor) };
    const s = iso(weekStart), e = iso(addDays(weekStart, 6));
    return { start: s, end: e, label: `${fmtShort(weekStart)} – ${fmtShort(addDays(weekStart, 6))}` };
  }, [viewMode, weekAnchor, monthCursor, yearCursor, weekStart]);

  const previousPeriodRange = useMemo(() => {
    if (viewMode === "יומי") { const d = addDays(weekAnchor, -1); const s = iso(d); return { start: s, end: s }; }
    if (viewMode === "חודשי") {
      const prevM = addMonths(monthCursor, -1);
      const s = iso(startOfMonth(prevM));
      const endD = new Date(prevM.getFullYear(), prevM.getMonth() + 1, 0);
      return { start: s, end: iso(endD) };
    }
    if (viewMode === "שנתי") return { start: `${yearCursor - 1}-01-01`, end: `${yearCursor - 1}-12-31` };
    const prevStart = addDays(weekStart, -7);
    return { start: iso(prevStart), end: iso(addDays(prevStart, 6)) };
  }, [viewMode, weekAnchor, monthCursor, yearCursor, weekStart]);

  const periodEntries = useMemo(() => filteredEntries.filter((e) => e.valueDate >= periodRange.start && e.valueDate <= periodRange.end), [filteredEntries, periodRange]);
  const previousPeriodEntries = useMemo(() => filteredEntries.filter((e) => e.valueDate >= previousPeriodRange.start && e.valueDate <= previousPeriodRange.end), [filteredEntries, previousPeriodRange]);

  const periodIncome = periodEntries.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const periodExpense = periodEntries.filter((e) => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);
  const prevIncome = previousPeriodEntries.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const prevExpense = previousPeriodEntries.filter((e) => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);
  const incomeTrend = pctChange(periodIncome, prevIncome);
  const expenseTrend = pctChange(periodExpense, prevExpense);
  const balance = periodIncome - periodExpense;
  const prevBalance = prevIncome - prevExpense;
  const balanceTrend = pctChange(balance, prevBalance);

  const categoryTotals = useMemo(() => {
    const map = {}; for (const c of categories) map[c.id] = 0;
    for (const e of periodEntries) map[e.category] = (map[e.category] || 0) + Math.abs(e.amount);
    return categories.map((c) => ({ ...c, total: map[c.id] || 0 }));
  }, [periodEntries, categories]);
  const maxCatTotal = Math.max(1, ...categoryTotals.map((c) => c.total));

  function jumpToDate(d) { setWeekAnchor(d); setMonthCursor(startOfMonth(d)); setYearCursor(d.getFullYear()); }
  function goToday() { jumpToDate(new Date()); }
  function shiftWeek(delta) { setWeekAnchor(addDays(weekStart, delta * 7)); }
  function shiftPeriod(delta) {
    if (viewMode === "יומי") jumpToDate(addDays(weekAnchor, delta));
    else if (viewMode === "חודשי") jumpToDate(addMonths(monthCursor, delta));
    else if (viewMode === "שנתי") { const ny = yearCursor + delta; const d = new Date(ny, monthCursor.getMonth(), 1); setYearCursor(ny); setMonthCursor(startOfMonth(d)); setWeekAnchor(d); }
    else shiftWeek(delta);
  }

  const reportRows = useMemo(() => {
    const map = {};
    for (const e of entries) {
      const key = e.partyId || `_free_${e.partyName || "ללא שם"}`;
      if (!map[key]) map[key] = { id: key, name: e.partyName || "ללא שם", type: e.partyType || "client", income: 0, expense: 0, count: 0 };
      if (e.amount > 0) map[key].income += e.amount; else map[key].expense += Math.abs(e.amount);
      map[key].count += 1;
    }
    for (const p of parties) if (!map[p.id]) map[p.id] = { id: p.id, name: p.name, type: p.type, income: 0, expense: 0, count: 0 };
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name, "he"));
  }, [entries, parties]);
  const reportGrouped = useMemo(() => {
    if (!reportGroupByType) return { "": reportRows };
    const g = {}; for (const t of PARTY_TYPES) g[t.id] = [];
    for (const r of reportRows) { if (!g[r.type]) g[r.type] = []; g[r.type].push(r); }
    return g;
  }, [reportRows, reportGroupByType]);

  // Checks database (all entries paid by check)
  const checkEntries = useMemo(() => entries.filter((e) => e.paymentMethod === "צ'ק"), [entries]);
  const checksFiltered = useMemo(() => {
    let list = checkEntries;
    for (const k of Object.keys(checksFilters)) {
      const v = (checksFilters[k] || "").toLowerCase();
      if (!v) continue;
      list = list.filter((e) => String(e[k] || "").toLowerCase().includes(v));
    }
    const { key, dir } = checksSort;
    list = [...list].sort((a, b) => {
      let av = a[key], bv = b[key];
      if (key === "amount") { av = Math.abs(av); bv = Math.abs(bv); }
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [checkEntries, checksFilters, checksSort]);
  function toggleChecksSort(key) {
    setChecksSort((prev) => prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
  }

  function downloadCSV(filename, rows, headers) {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [headers.map((h) => esc(h.label)).join(","), ...rows.map((r) => headers.map((h) => esc(h.get(r))).join(","))];
    const csv = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
  function exportChecksCSV() {
    downloadCSV("המחאות.csv", checksFiltered, [
      { label: "תאריך", get: (r) => r.valueDate },
      { label: "סכום", get: (r) => r.amount },
      { label: "שם", get: (r) => r.partyName },
      { label: "מספר צ'ק", get: (r) => r.checkNumber },
      { label: "בנק וסניף", get: (r) => r.bankBranch },
      { label: "קטגוריה", get: (r) => catById(r.category).label },
      { label: "סטטוס", get: (r) => r.status },
    ]);
  }
  function exportAllEntriesCSV() {
    downloadCSV("תנועות.csv", entries, [
      { label: "תאריך", get: (r) => r.valueDate },
      { label: "סוג", get: (r) => r.type === "income" ? "הכנסה" : "הוצאה" },
      { label: "סכום", get: (r) => r.amount },
      { label: "שם", get: (r) => r.partyName },
      { label: "קטגוריה", get: (r) => catById(r.category).label },
      { label: "אמצעי תשלום", get: (r) => r.paymentMethod },
      { label: "סטטוס", get: (r) => r.status },
      { label: "הערות", get: (r) => r.notes },
    ]);
  }

  function calcDigit(d) {
    if (calcReset) { setCalcDisplay(d); setCalcReset(false); return; }
    setCalcDisplay((prev) => (prev === "0" ? d : prev + d));
  }
  function calcDot() {
    if (calcReset) { setCalcDisplay("0."); setCalcReset(false); return; }
    if (!calcDisplay.includes(".")) setCalcDisplay((prev) => prev + ".");
  }
  function calcOperate(op) {
    const val = parseFloat(calcDisplay);
    if (calcPrev !== null && calcOp) {
      const res = calcCompute(calcPrev, val, calcOp);
      setCalcDisplay(String(res)); setCalcPrev(res);
    } else setCalcPrev(val);
    setCalcOp(op); setCalcReset(true);
  }
  function calcCompute(a, b, op) {
    if (op === "+") return a + b;
    if (op === "-") return a - b;
    if (op === "×") return a * b;
    if (op === "÷") return b === 0 ? 0 : a / b;
    return b;
  }
  function calcEquals() {
    if (calcPrev !== null && calcOp) {
      const res = calcCompute(calcPrev, parseFloat(calcDisplay), calcOp);
      setCalcDisplay(String(res)); setCalcPrev(null); setCalcOp(null); setCalcReset(true);
    }
  }
  function calcClear() { setCalcDisplay("0"); setCalcPrev(null); setCalcOp(null); setCalcReset(false); }
  function calcBackspace() { setCalcDisplay((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0")); }

  const fabActions = [
    { label: "הוספת הכנסה", icon: Plus, color: "#33B679", action: () => openForm("income") },
    { label: "הוספת הוצאה", icon: Minus, color: "#E67C73", action: () => openForm("expense") },
    { label: "הוספת תזכורת", icon: CalendarPlus, color: "#8E24AA", action: openReminderForm },
    { label: "רשומת לקוח/ספק", icon: Users, color: "#039BE5", action: startNewParty },
  ];

  if (!loaded) return <div dir="rtl" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Assistant', sans-serif", color: SLATE }}>טוען נתונים...</div>;

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#EEF1F6", fontFamily: "'Assistant', sans-serif", color: INK }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700;800&family=Frank+Ruhl+Libre:wght@600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin:0; }
        input, select, textarea, button { font-family: 'Assistant', sans-serif; }
        ::-webkit-scrollbar { width: 6px; height:6px; }
        ::-webkit-scrollbar-thumb { background: #C7CDDA; border-radius: 3px; }
        .menu-btn { transition: background .12s ease; cursor:pointer; }
        .menu-btn:hover { background:#EEF2FB; }
        .pill { transition: all .12s ease; cursor:pointer; }
        .chip { transition: transform .1s ease; cursor:pointer; }
        .chip:hover { transform: scale(1.02); }
        .sheet-enter { animation: slideup .2s cubic-bezier(.2,.8,.2,1); }
        @keyframes slideup { from{transform:translateY(24px);opacity:0;} to{transform:translateY(0);opacity:1;} }
        .row-hover:hover { background:#F8F9FA; }
        .fab-item { animation: fabin .16s ease both; }
        @keyframes fabin { from{opacity:0;transform:translateY(6px) scale(.9);} to{opacity:1;transform:translateY(0) scale(1);} }
        .fab-main { transition: transform .15s ease, box-shadow .15s ease; }
        .fab-main:active { transform: scale(.94); }
        .seg { transition: all .15s ease; }
        .navitem:hover { background:rgba(255,255,255,.06); }
        .tb-btn:hover { background:#F1F3F8; }
        .day-cell:hover { background:#F7F8FB; }
        .calc-btn { transition: transform .1s ease, background .1s ease; }
        .calc-btn:active { transform: scale(.94); }
        .th-sort:hover { color:${ACCENT}; }
        @media print { .fab-main, .fab-item, .no-print { display:none !important; } }
      `}</style>

      {/* ===== Shell: content (ltr-forced grid) + navy sidebar on the right ===== */}
      <div style={{ maxWidth: "1500px", margin: "0 auto", padding: "1rem", display: "grid", gridTemplateColumns: "1fr 190px", gap: "1rem", direction: "ltr" }}>

        {/* MAIN (direction rtl re-applied) */}
        <div dir="rtl" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Top bar */}
          <div style={{ background: "#fff", borderRadius: "1rem", padding: "0.9rem 1.3rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.7rem", boxShadow: "0 2px 10px rgba(16,27,51,.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.8rem", color: SLATE }}>
              <button onClick={() => supabase.auth.signOut()} title="התנתקות" style={{ border: "none", background: "none", cursor: "pointer", color: SLATE, display: "flex" }}><LogOut size={16} /></button>
              <div>שלום,<br /><b style={{ color: INK, fontSize: "0.88rem" }}>{session.user.email?.split("@")[0] || "משתמש"}</b></div>
            </div>

            <div style={{ display: "flex", gap: "0.6rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#FDECEC", borderRadius: "0.6rem", padding: "0.4rem 0.8rem" }}>
                <span style={{ width: "1.7rem", height: "1.7rem", borderRadius: "50%", background: RED, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><TrendingDown size={13} /></span>
                <div>
                  <div style={{ fontSize: "0.62rem", color: SLATE }}>{`סה"כ הוצאות ${periodWordFor(viewMode)}`}</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#C6373C" }}>{formatILS(periodExpense)}</div>
                </div>
                {expenseTrend !== null && <span style={{ fontSize: "0.62rem", color: expenseTrend >= 0 ? "#C6373C" : "#1E8E5A", fontWeight: 700 }}>{expenseTrend >= 0 ? "▲" : "▼"} {Math.abs(expenseTrend).toFixed(0)}%</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#E8F7ED", borderRadius: "0.6rem", padding: "0.4rem 0.8rem" }}>
                <span style={{ width: "1.7rem", height: "1.7rem", borderRadius: "50%", background: GREEN, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><TrendingUp size={13} /></span>
                <div>
                  <div style={{ fontSize: "0.62rem", color: SLATE }}>{`סה"כ הכנסות ${periodWordFor(viewMode)}`}</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#188A4B" }}>{formatILS(periodIncome)}</div>
                </div>
                {incomeTrend !== null && <span style={{ fontSize: "0.62rem", color: incomeTrend >= 0 ? "#1E8E5A" : "#C6373C", fontWeight: 700 }}>{incomeTrend >= 0 ? "▲" : "▼"} {Math.abs(incomeTrend).toFixed(0)}%</span>}
              </div>
            </div>

            <div style={{ textAlign: "center", fontSize: "0.75rem", color: SLATE }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", justifyContent: "center", fontSize: "1.05rem", fontWeight: 800, color: INK }}><Clock size={14} />{now.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
              {now.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div>
                <h1 style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: "1.1rem", margin: 0 }}>לוח הבקרה הפיננסי</h1>
                <p style={{ fontSize: "0.68rem", color: "#8A93A6", margin: 0 }}>ניהול הכנסות והוצאות בקלות</p>
              </div>
              <Logo size={40} />
            </div>
          </div>

          {searchOpen && (
            <div style={{ background: "#fff", borderRadius: "0.8rem", padding: "0.5rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem", boxShadow: "0 2px 10px rgba(16,27,51,.06)" }}>
              <Search size={16} color="#80868B" />
              <input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="חיפוש לפי שם, תיאור..." style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: "0.85rem" }} />
              {searchQuery && <button onClick={() => setSearchQuery("")} style={{ border: "none", background: "none", cursor: "pointer", color: "#80868B" }}><X size={14} /></button>}
            </div>
          )}

          {error && (
            <div style={{ background: "#FDECEA", color: "#C5453D", fontSize: "0.8rem", padding: "0.6rem 1rem", borderRadius: "0.6rem", display: "flex", justifyContent: "space-between" }}>
              <span>{error}</span><button onClick={() => setError("")} style={{ border: "none", background: "none", color: "#C5453D", cursor: "pointer" }}><X size={14} /></button>
            </div>
          )}

          {/* Top toolbar */}
          <div style={{ background: "#fff", borderRadius: "1rem", padding: "0.6rem 1rem", display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", boxShadow: "0 2px 10px rgba(16,27,51,.06)" }}>
            <ToolbarBtn icon={Plus} label="הוספה חדשה" onClick={() => setFabOpen((v) => !v)} accent />
            <ToolbarBtn icon={Receipt} label="חשבוניות" onClick={() => setShowInvoiceList(true)} />
            <ToolbarBtn icon={TrendingUp} label="הכנסה" onClick={() => openForm("income")} />
            <ToolbarBtn icon={TrendingDown} label="הוצאה" onClick={() => openForm("expense")} />
            <ToolbarBtn icon={Users} label="לקוחות וספקים" onClick={() => { setShowPartyManager(true); setEditingPartyId(null); }} />
            <ToolbarBtn icon={BarChart3} label="דוחות" onClick={() => setShowReport(true)} />
            <ToolbarBtn icon={Home} label="בית" onClick={() => setShowHomeMenu(true)} />
          </div>

          {/* 3-column main grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: "1rem", alignItems: "start" }}>

            {/* Calendar hero */}
            <div style={{ background: "#fff", borderRadius: "1rem", padding: "1.1rem", boxShadow: "0 2px 10px rgba(16,27,51,.06)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.8rem" }}>
                <button onClick={goToday} style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: "0.5rem", padding: "0.4rem 0.9rem", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>היום</button>
                <span style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: "1.15rem", fontWeight: 700 }}>{periodRange.label}</span>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <NavArrow onClick={() => shiftPeriod(-1)}>‹</NavArrow>
                  <NavArrow onClick={() => shiftPeriod(1)}>›</NavArrow>
                </div>
              </div>

              {viewMode === "חודשי" && <MonthHero monthCursor={monthCursor} entries={filteredEntries} reminders={reminders} categories={categories} onPickDay={(d) => { jumpToDate(d); setViewMode("יומי"); }} />}
              {viewMode === "שבועי" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", minHeight: "22rem" }}>
                  {weekDays.map((d, i) => {
                    const dIso = iso(d); const dayEntries = entriesByDay[dIso] || []; const isToday = dIso === todayISO();
                    return (
                      <div key={dIso} style={{ borderRight: i < 6 ? "1px solid #EEF0F2" : "none", display: "flex", flexDirection: "column" }}>
                        <div style={{ textAlign: "center", padding: "0.4rem 0", borderBottom: "1px solid #EEF0F2", background: isToday ? "#E8EEFF" : "#FAFBFD" }}>
                          <div style={{ fontSize: "0.64rem", color: "#8A939C" }}>{DAY_LABELS[i]}</div>
                          <div style={{ fontSize: "0.82rem", fontWeight: isToday ? 800 : 500, color: isToday ? ACCENT : "#3C4043" }}>{d.getDate()}</div>
                        </div>
                        <div style={{ flex: 1, padding: "0.25rem", display: "flex", flexDirection: "column", gap: "0.2rem", overflowY: "auto" }}>
                          {(remindersByDay[dIso] || []).map((r) => { const rs = reminderStatusMeta(r.status); return (
                            <div key={r.id} className="chip" onClick={() => openEditReminderForm(r)} onContextMenu={(ev) => openContextMenu(ev, "reminder", r)} style={{ background: rs.color, borderRadius: "0.3rem", padding: "0.22rem 0.35rem", fontSize: "0.56rem", color: "#fff" }}>
                              <div style={{ fontWeight: 700 }}>{r.time}</div><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</div>
                            </div>
                          ); })}
                          {dayEntries.map((e) => { const cat = catById(e.category); return (
                            <div key={e.id} className="chip" onClick={() => openEditForm(e)} onContextMenu={(ev) => openContextMenu(ev, "entry", e)} style={{ background: entryStatusColor(e.status), borderRadius: "0.3rem", padding: "0.22rem 0.35rem", fontSize: "0.56rem", position: "relative", color: "#fff" }}>
                              <div style={{ position: "absolute", top: "2px", left: "2px", width: "6px", height: "6px", borderRadius: "50%", background: cat.color, border: "1px solid #fff" }} />
                              <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.partyName || cat.label}</div>
                              <div style={{ fontWeight: 700 }}>{formatILS(e.amount)}</div>
                            </div>
                          ); })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {viewMode === "יומי" && (
                <DayView date={weekAnchor} periodEntries={periodEntries} reminders={reminders} categories={categories}
                  onEditEntry={openEditForm} onDeleteEntry={deleteEntry} onEditReminder={openEditReminderForm} onDeleteReminder={deleteReminder}
                  onContextMenuEntry={(ev, item) => openContextMenu(ev, "entry", item)} onContextMenuReminder={(ev, item) => openContextMenu(ev, "reminder", item)} />
              )}
              {viewMode === "שנתי" && <YearView yearCursor={yearCursor} periodEntries={periodEntries} onPickMonth={(d) => { jumpToDate(d); setViewMode("חודשי"); }} />}

              <button onClick={() => openForm("expense")} style={{ marginTop: "1rem", background: ACCENT, color: "#fff", border: "none", borderRadius: "2rem", padding: "0.75rem 1.2rem", fontSize: "0.85rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", boxShadow: "0 6px 16px rgba(46,91,255,.35)" }}>
                <Plus size={16} /> הוספת תנועה מהירה
              </button>
            </div>

            {/* Summary column: categories + balance + calculator + notes */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ background: "#fff", borderRadius: "1rem", padding: "1.1rem", boxShadow: "0 2px 10px rgba(16,27,51,.06)" }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", margin: "0 0 0.9rem" }}><BarChart3 size={15} color={ACCENT} /> סיכום ל{periodWordFor(viewMode)} · {periodRange.label}</h3>
                {categoryTotals.map((c) => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.55rem" }}>
                    <span style={{ fontSize: "0.7rem", color: SLATE, width: "5.2rem", flexShrink: 0 }}>{c.label}</span>
                    <div style={{ flex: 1, height: "6px", background: "#F0F2F6", borderRadius: "4px", overflow: "hidden" }}><div style={{ width: `${(c.total / maxCatTotal) * 100}%`, height: "100%", background: c.color, borderRadius: "4px" }} /></div>
                    <span style={{ fontSize: "0.65rem", color: "#8A93A6", width: "3.2rem", textAlign: "left" }}>{formatILS(c.total)}</span>
                  </div>
                ))}
                <div style={{ marginTop: "0.9rem", background: balance >= 0 ? "#F1F6F2" : "#FDECEC", borderRadius: "0.7rem", padding: "0.7rem 0.9rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.72rem", color: balance >= 0 ? "#3F6B4A" : "#8A3A3A" }}>{`יתרה ל${periodWordFor(viewMode)}`}</span>
                  <span style={{ fontSize: "1.05rem", fontWeight: 800, color: balance >= 0 ? GREEN : RED }}>{formatILS(balance)}</span>
                </div>
              </div>

              {/* Calculator */}
              <div style={{ background: "#fff", borderRadius: "1rem", padding: "1rem", boxShadow: "0 2px 10px rgba(16,27,51,.06)" }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", margin: "0 0 0.6rem" }}><Calculator size={15} color={ACCENT} /> מחשבון</h3>
                <div style={{ background: "#F7F8FB", borderRadius: "0.5rem", padding: "0.6rem 0.8rem", textAlign: "left", fontSize: "1.3rem", fontWeight: 700, marginBottom: "0.6rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", direction: "ltr" }}>{calcDisplay}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.4rem" }}>
                  <CalcBtn onClick={calcClear} label="C" muted /><CalcBtn onClick={calcBackspace} label="⌫" muted /><CalcBtn onClick={() => calcOperate("÷")} label="÷" op /><CalcBtn onClick={() => calcOperate("×")} label="×" op />
                  <CalcBtn onClick={() => calcDigit("7")} label="7" /><CalcBtn onClick={() => calcDigit("8")} label="8" /><CalcBtn onClick={() => calcDigit("9")} label="9" /><CalcBtn onClick={() => calcOperate("-")} label="−" op />
                  <CalcBtn onClick={() => calcDigit("4")} label="4" /><CalcBtn onClick={() => calcDigit("5")} label="5" /><CalcBtn onClick={() => calcDigit("6")} label="6" /><CalcBtn onClick={() => calcOperate("+")} label="+" op />
                  <CalcBtn onClick={() => calcDigit("1")} label="1" /><CalcBtn onClick={() => calcDigit("2")} label="2" /><CalcBtn onClick={() => calcDigit("3")} label="3" />
                  <CalcBtn onClick={calcEquals} label="=" wide accent style={{ gridRow: "span 2" }} />
                  <CalcBtn onClick={() => calcDigit("0")} label="0" wide /><CalcBtn onClick={calcDot} label="." />
                </div>
              </div>

              {/* Notes */}
              <div style={{ background: "#fff", borderRadius: "1rem", padding: "1rem", boxShadow: "0 2px 10px rgba(16,27,51,.06)" }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", margin: "0 0 0.6rem" }}><StickyNote size={15} color={ACCENT} /> פתקים</h3>
                <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.7rem" }}>
                  <input value={noteInput} onChange={(e) => setNoteInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} placeholder="פתק חדש..." style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
                  <button onClick={addNote} style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: "0.45rem", padding: "0 0.8rem", cursor: "pointer" }}><Plus size={15} /></button>
                </div>
                {notes.length === 0 && <div style={{ fontSize: "0.75rem", color: "#9AA0A6", textAlign: "center", padding: "0.5rem 0" }}>אין פתקים עדיין.</div>}
                {notes.map((n) => (
                  <div key={n.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", background: "#FFF9E5", border: "1px solid #F0E4A8", borderRadius: "0.4rem", padding: "0.4rem 0.6rem", marginBottom: "0.4rem", fontSize: "0.8rem" }}>
                    <span style={{ flex: 1, wordBreak: "break-word" }}>{n.text}</span>
                    <button onClick={() => deleteNote(n.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#8A6D1E", flexShrink: 0 }}><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right utility column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ background: "#fff", borderRadius: "1rem", padding: "0.9rem", boxShadow: "0 2px 10px rgba(16,27,51,.06)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <NavArrow onClick={() => setMonthCursor(addMonths(monthCursor, -1))}>‹</NavArrow>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>{new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(monthCursor)}</span>
                  <NavArrow onClick={() => setMonthCursor(addMonths(monthCursor, 1))}>›</NavArrow>
                </div>
                <MiniCalendar monthCursor={monthCursor} onPick={jumpToDate} weekStart={weekStart} />
              </div>

              <div style={{ background: "#fff", borderRadius: "1rem", padding: "0.9rem", boxShadow: "0 2px 10px rgba(16,27,51,.06)" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: SLATE, marginBottom: "0.5rem" }}>תצוגה</div>
                <div style={{ display: "flex", gap: "0.3rem" }}>
                  {VIEW_MODES.map((v) => <span key={v} className="seg" onClick={() => setViewMode(v)} style={{ flex: 1, textAlign: "center", fontSize: "0.72rem", padding: "0.4rem 0.2rem", borderRadius: "0.5rem", background: viewMode === v ? ACCENT : "#F1F3F8", color: viewMode === v ? "#fff" : SLATE, cursor: "pointer" }}>{v}</span>)}
                </div>
              </div>

              <div style={{ background: "#fff", borderRadius: "1rem", padding: "0.9rem", boxShadow: "0 2px 10px rgba(16,27,51,.06)" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: SLATE, marginBottom: "0.5rem" }}>סינון לפי סוג צד</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                  {PARTY_FILTER_OPTIONS.map((p) => <span key={p.id} className="pill" onClick={() => setPartyFilter(p.id)} style={{ fontSize: "0.72rem", padding: "0.3rem 0.65rem", borderRadius: "1rem", border: partyFilter === p.id ? `1px solid ${ACCENT}` : "1px solid #E1E5EE", background: partyFilter === p.id ? "#E8EEFF" : "#fff", color: partyFilter === p.id ? ACCENT : SLATE }}>{p.label}</span>)}
                </div>
              </div>

              <div style={{ background: "#fff", borderRadius: "1rem", padding: "0.9rem", boxShadow: "0 2px 10px rgba(16,27,51,.06)" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: SLATE, marginBottom: "0.6rem" }}>קיצורי דרך</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.5rem" }}>
                  <ShortcutBtn icon={Plus} label="הכנסה" color="#33B679" onClick={() => openForm("income")} />
                  <ShortcutBtn icon={Minus} label="הוצאה" color="#E67C73" onClick={() => openForm("expense")} />
                  <ShortcutBtn icon={Users} label="לקוח חדש" color="#039BE5" onClick={startNewParty} />
                  <ShortcutBtn icon={Receipt} label="חשבונית" color="#8E24AA" onClick={openInvoiceForm} />
                  <ShortcutBtn icon={Table2} label="המחאות" color="#F6BF26" onClick={() => setShowChecksDb(true)} />
                  <ShortcutBtn icon={BarChart3} label="דוח" color={ACCENT} onClick={() => setShowReport(true)} />
                </div>
              </div>

              <div style={{ background: "#fff", borderRadius: "1rem", padding: "0.9rem", boxShadow: "0 2px 10px rgba(16,27,51,.06)" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: SLATE, marginBottom: "0.5rem" }}>מידע עדכני</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: SLATE }}><DollarSign size={13} color={ACCENT} /> דולר/שקל</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>{usdRate ? `₪${usdRate.toFixed(2)}` : "טוען..."}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: SLATE }}><Cloud size={13} color={ACCENT} /> {weather ? weather.cityLabel : "מזג אוויר"}</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>{weather ? `${weatherInfo(weather.code).emoji} ${Math.round(weather.temp)}°` : "טוען..."}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* NAVY SIDEBAR (right) */}
        <div dir="rtl" style={{ background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY2} 55%, #0E1A30 100%)`, borderRadius: "1rem", padding: "1.4rem 1rem", display: "flex", flexDirection: "column", gap: "0.35rem", position: "relative", overflow: "hidden", minHeight: "780px" }} className="no-print">
          <div style={{ width: "2.6rem", height: "2.6rem", borderRadius: "0.8rem", background: `linear-gradient(135deg, ${ACCENT}, #1B3FCC)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.3rem", boxShadow: "0 6px 18px rgba(46,91,255,.4)" }}>
            <span style={{ color: "#fff", fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700, fontSize: "1.1rem" }}>₪</span>
          </div>
          <SideNavItem icon={Home} label="לוח בקרה" active />
          <SideNavItem icon={BarChart3} label="תנועות" onClick={() => setViewMode("חודשי")} />
          <SideNavItem icon={Users} label="לקוחות וספקים" onClick={() => { setShowPartyManager(true); setEditingPartyId(null); }} />
          <SideNavItem icon={Receipt} label="חשבוניות" onClick={() => setShowInvoiceList(true)} />
          <SideNavItem icon={ArrowUpDown} label="דוחות" onClick={() => setShowReport(true)} />
          <SideNavItem icon={Home} label="בית" onClick={() => setShowHomeMenu(true)} />
          <div style={{ marginTop: "auto", fontSize: "0.7rem", color: "#7E8CB0", lineHeight: 1.5, paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,.08)" }}>"ניהול נכון מביא לשקט נפשי"</div>
        </div>
      </div>

      {/* FAB */}
      <div style={{ position: "fixed", bottom: "1.6rem", left: "1.6rem", display: "flex", flexDirection: "column-reverse", alignItems: "flex-start", gap: "0.6rem", zIndex: 200 }}>
        <button className="fab-main" onClick={() => setFabOpen((v) => !v)} aria-label="פעולה חדשה" style={{ width: "3.4rem", height: "3.4rem", borderRadius: "50%", background: ACCENT, border: "none", boxShadow: "0 6px 18px rgba(46,91,255,.4)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Plus size={24} color="#fff" style={{ transform: fabOpen ? "rotate(45deg)" : "none", transition: "transform .15s ease" }} />
        </button>
        {fabOpen && fabActions.map((a, idx) => { const Icon = a.icon; return (
          <button key={a.label} className="fab-item" onClick={a.action} style={{ animationDelay: `${idx * 0.03}s`, display: "flex", alignItems: "center", gap: "0.6rem", background: "#fff", border: "1px solid #E1E5EE", borderRadius: "2rem", padding: "0.5rem 0.9rem 0.5rem 0.6rem", boxShadow: "0 3px 10px rgba(0,0,0,.1)", cursor: "pointer" }}>
            <span style={{ width: "1.7rem", height: "1.7rem", borderRadius: "50%", background: a.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={13} color="#fff" /></span>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: INK, whiteSpace: "nowrap" }}>{a.label}</span>
          </button>
        ); })}
      </div>
      {fabOpen && <div onClick={() => setFabOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 35 }} />}

      {/* Context menu */}
      {contextMenu && (
        <div onClick={closeContextMenu} onContextMenu={(ev) => { ev.preventDefault(); closeContextMenu(); }} style={{ position: "fixed", inset: 0, zIndex: 90 }}>
          <div onClick={(ev) => ev.stopPropagation()} style={{ position: "fixed", top: contextMenu.y, left: contextMenu.x, zIndex: 91, background: "#fff", border: "1px solid #E1E5EE", borderRadius: "0.6rem", boxShadow: "0 8px 24px rgba(0,0,0,.18)", minWidth: "10rem", overflow: "hidden" }}>
            {contextMenu.kind === "reminder" && (<>
              {REMINDER_STATUSES.map((s) => <button key={s.id} onClick={() => { markReminderStatus(contextMenu.item, s.id); closeContextMenu(); }} className="menu-btn" style={ctxMenuBtnStyle}><span style={{ width: "0.7rem", height: "0.7rem", borderRadius: "50%", background: s.color }} />{`סמן כ${s.label}`}</button>)}
              <div style={{ borderTop: "1px solid #EEF0F2" }} />
            </>)}
            <button onClick={handleMenuEdit} className="menu-btn" style={ctxMenuBtnStyle}><Pencil size={14} /> עריכה</button>
            <button onClick={handleMenuDuplicate} className="menu-btn" style={ctxMenuBtnStyle}><Copy size={14} /> שכפול</button>
            <button onClick={handleMenuDelete} className="menu-btn" style={{ ...ctxMenuBtnStyle, color: "#C5453D" }}><Trash2 size={14} /> מחיקה</button>
          </div>
        </div>
      )}

      {/* Home menu */}
      {showHomeMenu && (
        <div onClick={() => setShowHomeMenu(false)} style={modalBackdrop}>
          <div className="sheet-enter" onClick={(e) => e.stopPropagation()} style={{ ...modalCard, maxWidth: "26rem" }}>
            <ModalHeader title="בית" icon={Home} onClose={() => setShowHomeMenu(false)} />
            <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1.2rem" }}>
              <button onClick={handleSaveConfirm} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", padding: "0.65rem", borderRadius: "0.5rem", border: "1px solid #DFE3E7", background: savedConfirm ? "#EAF7EF" : "#fff", color: savedConfirm ? "#1E8E5A" : INK, cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}><Save size={15} /> {savedConfirm ? "נשמר ✓" : "שמור"}</button>
              <button onClick={handlePrint} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", padding: "0.65rem", borderRadius: "0.5rem", border: "1px solid #DFE3E7", background: "#fff", color: INK, cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}><Printer size={15} /> הדפס</button>
              <button onClick={exportAllEntriesCSV} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", padding: "0.65rem", borderRadius: "0.5rem", border: "1px solid #DFE3E7", background: "#fff", color: INK, cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}><FileDown size={15} /> CSV</button>
            </div>
            <div style={{ fontSize: "0.72rem", color: "#9AA0A6", marginBottom: "0.8rem" }}>הנתונים נשמרים אוטומטית מיד עם כל פעולה — "שמור" הוא רק לאישור.</div>
            <button onClick={openDeletedHistory} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", padding: "0.6rem", borderRadius: "0.5rem", border: `1px solid ${ACCENT}`, background: "#fff", color: ACCENT, cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, marginBottom: "1rem" }}><Trash2 size={14} /> היסטוריה מלאה — פריטים שנמחקו</button>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: SLATE, marginBottom: "0.6rem" }}>10 הפעולות האחרונות</div>
            {history.length === 0 && <div style={{ textAlign: "center", color: "#9AA0A6", fontSize: "0.85rem", padding: "1.5rem 0" }}>אין עדיין פעולות להצגה.</div>}
            {history.map((h) => (
              <div key={h.id} className="row-hover" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0.3rem", borderBottom: "1px solid #EEF0F2" }}>
                <div><div style={{ fontSize: "0.82rem" }}>{h.label}</div><div style={{ fontSize: "0.68rem", color: "#9AA0A6" }}>{h.time.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</div></div>
                <button onClick={() => undoHistoryEntry(h.id)} style={{ border: `1px solid ${ACCENT}`, background: "#fff", color: ACCENT, borderRadius: "0.4rem", padding: "0.3rem 0.7rem", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>בטל</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deleted items — full history */}
      {showDeletedHistory && (
        <div onClick={() => setShowDeletedHistory(false)} style={modalBackdrop}>
          <div className="sheet-enter" onClick={(e) => e.stopPropagation()} style={{ ...modalCard, maxWidth: "30rem" }}>
            <ModalHeader title="היסטוריה מלאה — פריטים שנמחקו" icon={Trash2} onClose={() => setShowDeletedHistory(false)} />
            <div style={{ fontSize: "0.72rem", color: "#9AA0A6", marginBottom: "1rem" }}>כל פריט שנמחק אי-פעם נשאר כאן לצמיתות ואפשר לשחזר אותו בכל זמן — בלי הגבלה של 10 פעולות אחרונות.</div>
            {deletedLoading && <div style={{ textAlign: "center", color: "#9AA0A6", fontSize: "0.85rem", padding: "1.5rem 0" }}>טוען...</div>}
            {!deletedLoading && deletedItems.length === 0 && <div style={{ textAlign: "center", color: "#9AA0A6", fontSize: "0.85rem", padding: "1.5rem 0" }}>אין פריטים שנמחקו.</div>}
            {!deletedLoading && deletedItems.map((item) => (
              <div key={`${item.kind}-${item.id}`} className="row-hover" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.55rem 0.3rem", borderBottom: "1px solid #EEF0F2" }}>
                <div>
                  <div style={{ fontSize: "0.82rem" }}>{item.label}</div>
                  <div style={{ fontSize: "0.68rem", color: "#9AA0A6" }}>נמחק ב-{new Date(item.deletedAt).toLocaleDateString("he-IL")} {new Date(item.deletedAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                <button onClick={() => restoreDeletedItem(item)} style={{ border: `1px solid ${ACCENT}`, background: "#fff", color: ACCENT, borderRadius: "0.4rem", padding: "0.3rem 0.7rem", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>שחזור</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/edit transaction sheet */}
      {showForm && (
        <div onClick={closeForm} style={modalBackdrop}>
          <div className="sheet-enter" onClick={(e) => e.stopPropagation()} style={modalCard}>
            <ModalHeader title={editingEntryId ? (form.type === "income" ? "עריכת הכנסה" : "עריכת הוצאה") : (form.type === "income" ? "הוספת הכנסה" : "הוספת הוצאה")} color={form.type === "income" ? "#1E8E5A" : "#C5453D"} onClose={closeForm} />
            <FieldLabel>סכום</FieldLabel>
            <input type="number" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" style={inputStyle} />
            <div style={{ display: "flex", gap: "0.6rem" }}>
              <div style={{ flex: 1 }}><FieldLabel>תאריך ערך</FieldLabel><input type="date" value={form.valueDate} onChange={(e) => setForm({ ...form, valueDate: e.target.value })} style={inputStyle} /></div>
              <div style={{ flex: 1 }}><FieldLabel>תאריך פירעון בפועל</FieldLabel><input type="date" value={form.actualDate} onChange={(e) => setForm({ ...form, actualDate: e.target.value })} style={inputStyle} /></div>
            </div>
            <FieldLabel>קטגוריה</FieldLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.8rem" }}>
              {categories.map((c) => <span key={c.id} className="pill" onClick={() => setForm({ ...form, category: c.id })} style={{ fontSize: "0.75rem", padding: "0.35rem 0.7rem", borderRadius: "0.4rem", border: form.category === c.id ? `1px solid ${c.color}` : "1px solid #DFE3E7", background: form.category === c.id ? c.color : "#fff", color: form.category === c.id ? "#fff" : SLATE }}>{c.label}</span>)}
            </div>
            <FieldLabel>ספק / לקוח / קבלן / עובד</FieldLabel>
            <div style={{ position: "relative", marginBottom: "0.7rem" }}>
              <input value={partyQuery} onChange={(e) => { setPartyQuery(e.target.value); setShowPartyDropdown(true); setForm({ ...form, partyId: "", partyName: e.target.value }); }} onFocus={() => setShowPartyDropdown(true)} placeholder="הקלד לחיפוש או ליצירת רשומה חדשה" style={{ ...inputStyle, marginBottom: 0 }} />
              {showPartyDropdown && (
                <div style={{ position: "absolute", top: "100%", right: 0, left: 0, background: "#fff", border: "1px solid #DFE3E7", borderRadius: "0.5rem", marginTop: "0.25rem", maxHeight: "10rem", overflowY: "auto", zIndex: 10, boxShadow: "0 4px 14px rgba(0,0,0,.1)" }}>
                  {partyMatches.map((p) => { const meta = partyTypeMeta(p.type); return <div key={p.id} className="row-hover" onClick={() => pickParty(p)} style={{ padding: "0.5rem 0.7rem", cursor: "pointer", display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}><span>{p.name}</span><span style={{ color: meta.color, fontSize: "0.7rem" }}>{meta.label}</span></div>; })}
                  {partyQuery.trim() && !parties.some((p) => p.name === partyQuery.trim()) && <div className="row-hover" onClick={quickAddParty} style={{ padding: "0.5rem 0.7rem", cursor: "pointer", fontSize: "0.82rem", color: ACCENT, borderTop: partyMatches.length ? "1px solid #EEF0F2" : "none" }}>+ הוספת "{partyQuery.trim()}" כרשומה חדשה</div>}
                  {!partyMatches.length && !partyQuery.trim() && <div style={{ padding: "0.5rem 0.7rem", fontSize: "0.78rem", color: "#9AA0A6" }}>הקלידו שם לחיפוש</div>}
                </div>
              )}
            </div>
            <FieldLabel>סוג</FieldLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.8rem" }}>
              {PARTY_TYPES.map((t) => <span key={t.id} className="pill" onClick={() => setForm({ ...form, partyType: t.id })} style={{ fontSize: "0.72rem", padding: "0.3rem 0.6rem", borderRadius: "0.4rem", border: form.partyType === t.id ? `1px solid ${t.color}` : "1px solid #DFE3E7", background: form.partyType === t.id ? `${t.color}18` : "#fff", color: form.partyType === t.id ? t.color : SLATE }}>{t.label}</span>)}
            </div>
            <FieldLabel>אמצעי תשלום</FieldLabel>
            <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} style={inputStyle}>{PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}</select>
            <FieldLabel>עבור מה / פרויקט</FieldLabel>
            <input value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} placeholder="תיאור" style={inputStyle} />
            <div onClick={() => setShowMore((v) => !v)} style={{ display: "flex", alignItems: "center", gap: "0.3rem", cursor: "pointer", color: ACCENT, fontSize: "0.8rem", margin: "0.6rem 0 0.9rem" }}>
              <ChevronDown size={15} style={{ transform: showMore ? "rotate(180deg)" : "none", transition: "transform .15s" }} />{showMore ? "פחות פרטים" : "עוד פרטים (צ׳ק, אסמכתא, סטטוס, התאמת בנק...)"}
            </div>
            {showMore && (<div>
              {form.paymentMethod === "צ'ק" && (<div style={{ display: "flex", gap: "0.6rem" }}>
                <div style={{ flex: 1 }}><FieldLabel>מספר צ׳ק</FieldLabel><input value={form.checkNumber} onChange={(e) => setForm({ ...form, checkNumber: e.target.value })} style={inputStyle} /></div>
                <div style={{ flex: 1 }}><FieldLabel>בנק וסניף</FieldLabel><input value={form.bankBranch} onChange={(e) => setForm({ ...form, bankBranch: e.target.value })} style={inputStyle} /></div>
              </div>)}
              <FieldLabel>מספר אסמכתא / חשבונית</FieldLabel><input value={form.refNumber} onChange={(e) => setForm({ ...form, refNumber: e.target.value })} style={inputStyle} />
              <FieldLabel>תת־קטגוריה</FieldLabel><input value={form.subCategory} onChange={(e) => setForm({ ...form, subCategory: e.target.value })} style={inputStyle} />
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <div style={{ flex: 1 }}><FieldLabel>סטטוס</FieldLabel><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inputStyle}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                <div style={{ flex: 1 }}><FieldLabel>סוג תשלום</FieldLabel><select value={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.value })} style={inputStyle}><option value="חד־פעמי">חד־פעמי</option><option value="הוראת קבע">הוראת קבע</option><option value="תשלומים">תשלומים</option></select></div>
              </div>
              {form.recurring === "תשלומים" && (<div style={{ display: "flex", gap: "0.6rem" }}>
                <div style={{ flex: 1 }}><FieldLabel>תשלום מספר</FieldLabel><input type="number" value={form.installmentNum} onChange={(e) => setForm({ ...form, installmentNum: e.target.value })} style={inputStyle} /></div>
                <div style={{ flex: 1 }}><FieldLabel>מתוך</FieldLabel><input type="number" value={form.installmentTotal} onChange={(e) => setForm({ ...form, installmentTotal: e.target.value })} style={inputStyle} /></div>
              </div>)}
              <FieldLabel>תגיות (מופרדות בפסיק)</FieldLabel><input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} style={inputStyle} />
              <FieldLabel>הערות</FieldLabel><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              <div style={{ marginTop: "0.6rem", marginBottom: "0.6rem", padding: "0.7rem", background: "#F8F9FA", borderRadius: "0.5rem", border: "1px solid #EEF0F2" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", fontWeight: 700, color: SLATE, marginBottom: "0.5rem" }}><Landmark size={14} /> התאמות בנק</div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", cursor: "pointer" }}><input type="checkbox" checked={form.bankReconciled} onChange={(e) => setForm({ ...form, bankReconciled: e.target.checked, reconciliationDate: e.target.checked ? (form.reconciliationDate || todayISO()) : "" })} /> הותאם מול דף חשבון הבנק</label>
                {form.bankReconciled && (<div style={{ marginTop: "0.5rem" }}><FieldLabel>תאריך ההתאמה</FieldLabel><input type="date" value={form.reconciliationDate} onChange={(e) => setForm({ ...form, reconciliationDate: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }} /></div>)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: "#80868B", marginBottom: "0.8rem" }}><Paperclip size={14} /> צירוף קובץ/קבלה — בשלב הבא</div>
            </div>)}
            {error && <div style={{ color: "#C5453D", fontSize: "0.8rem", marginBottom: "0.7rem", textAlign: "center" }}>{error}</div>}
            <button onClick={submitForm} style={{ width: "100%", padding: "0.85rem", borderRadius: "0.55rem", border: "none", background: form.type === "income" ? "#1E8E5A" : "#C5453D", color: "#fff", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer", marginTop: "0.4rem" }}>{editingEntryId ? "עדכון" : "שמירה"}</button>
            {editingEntryId && <button onClick={() => deleteEntry(editingEntryId)} style={{ width: "100%", padding: "0.7rem", borderRadius: "0.55rem", border: "1px solid #E1E5EE", background: "#fff", color: "#C5453D", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", marginTop: "0.5rem" }}>מחיקת רשומה</button>}
          </div>
        </div>
      )}

      {/* Reminder modal */}
      {showReminderForm && (
        <div onClick={closeReminderForm} style={modalBackdrop}>
          <div className="sheet-enter" onClick={(e) => e.stopPropagation()} style={{ ...modalCard, maxWidth: "26rem" }}>
            <ModalHeader title={editingReminderId ? "עריכת תזכורת" : "הוספת תזכורת"} color="#8E24AA" onClose={closeReminderForm} />
            <FieldLabel>כותרת</FieldLabel><input value={reminderForm.title} onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })} placeholder="למשל: תשלום לספק, פגישה..." style={inputStyle} />
            <div style={{ display: "flex", gap: "0.6rem" }}>
              <div style={{ flex: 1 }}><FieldLabel>יום</FieldLabel><input type="date" value={reminderForm.date} onChange={(e) => setReminderForm({ ...reminderForm, date: e.target.value })} style={inputStyle} /></div>
              <div style={{ flex: 1 }}><FieldLabel>שעה</FieldLabel><input type="time" value={reminderForm.time} onChange={(e) => setReminderForm({ ...reminderForm, time: e.target.value })} style={inputStyle} /></div>
            </div>
            <FieldLabel>סטטוס</FieldLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.8rem" }}>{REMINDER_STATUSES.map((s) => <span key={s.id} className="pill" onClick={() => setReminderForm({ ...reminderForm, status: s.id })} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.72rem", padding: "0.3rem 0.6rem", borderRadius: "0.4rem", border: reminderForm.status === s.id ? `1px solid ${s.color}` : "1px solid #DFE3E7", background: reminderForm.status === s.id ? `${s.color}18` : "#fff", color: reminderForm.status === s.id ? s.color : SLATE }}><span style={{ width: "0.6rem", height: "0.6rem", borderRadius: "50%", background: s.color }} />{s.label}</span>)}</div>
            <FieldLabel>חזרתיות</FieldLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.8rem" }}>{REPEAT_OPTIONS.map((o) => <span key={o.id} className="pill" onClick={() => setReminderForm({ ...reminderForm, repeat: o.id })} style={{ fontSize: "0.72rem", padding: "0.3rem 0.6rem", borderRadius: "0.4rem", border: reminderForm.repeat === o.id ? `1px solid ${ACCENT}` : "1px solid #DFE3E7", background: reminderForm.repeat === o.id ? "#E8EEFF" : "#fff", color: reminderForm.repeat === o.id ? ACCENT : SLATE }}>{o.label}</span>)}</div>
            <FieldLabel>נודניק</FieldLabel><select value={reminderForm.snooze} onChange={(e) => setReminderForm({ ...reminderForm, snooze: e.target.value })} style={inputStyle}>{SNOOZE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
            <FieldLabel>הערות</FieldLabel><textarea value={reminderForm.notes} onChange={(e) => setReminderForm({ ...reminderForm, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            {error && <div style={{ color: "#C5453D", fontSize: "0.8rem", marginBottom: "0.7rem", textAlign: "center" }}>{error}</div>}
            <button onClick={saveReminder} style={{ width: "100%", padding: "0.85rem", borderRadius: "0.55rem", border: "none", background: "#8E24AA", color: "#fff", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer", marginTop: "0.4rem" }}>{editingReminderId ? "עדכון תזכורת" : "שמירת תזכורת"}</button>
            {editingReminderId && <button onClick={() => deleteReminder(editingReminderId)} style={{ width: "100%", padding: "0.7rem", borderRadius: "0.55rem", border: "1px solid #E1E5EE", background: "#fff", color: "#C5453D", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", marginTop: "0.5rem" }}>מחיקת תזכורת</button>}
          </div>
        </div>
      )}

      {/* Party manager */}
      {showPartyManager && (
        <div onClick={() => { setShowPartyManager(false); setEditingPartyId(null); }} style={modalBackdrop}>
          <div className="sheet-enter" onClick={(e) => e.stopPropagation()} style={{ ...modalCard, maxWidth: "34rem" }}>
            <ModalHeader title="לקוחות, ספקים, קבלנים ועובדים" onClose={() => { setShowPartyManager(false); setEditingPartyId(null); }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>{[{ id: "all", label: "הכל" }, ...PARTY_TYPES].map((t) => <span key={t.id} className="pill" onClick={() => setManagerTypeFilter(t.id)} style={{ fontSize: "0.72rem", padding: "0.3rem 0.6rem", borderRadius: "0.4rem", border: managerTypeFilter === t.id ? `1px solid ${ACCENT}` : "1px solid #DFE3E7", background: managerTypeFilter === t.id ? "#E8EEFF" : "#fff", color: managerTypeFilter === t.id ? ACCENT : SLATE }}>{t.label}</span>)}</div>
              <button onClick={() => { setEditingPartyId("new"); setPartyForm(emptyParty); }} style={{ display: "flex", alignItems: "center", gap: "0.3rem", border: "none", background: ACCENT, color: "#fff", borderRadius: "0.45rem", padding: "0.4rem 0.7rem", fontSize: "0.78rem", cursor: "pointer", flexShrink: 0 }}><Plus size={14} /> חדש</button>
            </div>
            {editingPartyId && (<div style={{ background: "#F8F9FA", borderRadius: "0.55rem", padding: "0.9rem", marginBottom: "1rem", border: "1px solid #E4E7EB" }}>
              <FieldLabel>שם</FieldLabel><input value={partyForm.name} onChange={(e) => setPartyForm({ ...partyForm, name: e.target.value })} style={inputStyle} />
              <FieldLabel>סוג</FieldLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.7rem" }}>{PARTY_TYPES.map((t) => <span key={t.id} className="pill" onClick={() => setPartyForm({ ...partyForm, type: t.id })} style={{ fontSize: "0.72rem", padding: "0.3rem 0.6rem", borderRadius: "0.4rem", border: partyForm.type === t.id ? `1px solid ${t.color}` : "1px solid #DFE3E7", background: partyForm.type === t.id ? `${t.color}18` : "#fff", color: partyForm.type === t.id ? t.color : SLATE }}>{t.label}</span>)}</div>
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <div style={{ flex: 1 }}><FieldLabel>טלפון</FieldLabel><input value={partyForm.phone} onChange={(e) => setPartyForm({ ...partyForm, phone: e.target.value })} style={inputStyle} /></div>
                <div style={{ flex: 1 }}><FieldLabel>ח.פ / ת.ז</FieldLabel><input value={partyForm.idNumber} onChange={(e) => setPartyForm({ ...partyForm, idNumber: e.target.value })} style={inputStyle} /></div>
              </div>
              <FieldLabel>אימייל</FieldLabel><input value={partyForm.email} onChange={(e) => setPartyForm({ ...partyForm, email: e.target.value })} style={inputStyle} />
              <FieldLabel>כתובת</FieldLabel><input value={partyForm.address} onChange={(e) => setPartyForm({ ...partyForm, address: e.target.value })} style={inputStyle} />
              <FieldLabel>הערות</FieldLabel><textarea value={partyForm.notes} onChange={(e) => setPartyForm({ ...partyForm, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={saveParty} style={{ flex: 1, padding: "0.6rem", borderRadius: "0.45rem", border: "none", background: ACCENT, color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}>שמירה</button>
                <button onClick={() => setEditingPartyId(null)} style={{ flex: 1, padding: "0.6rem", borderRadius: "0.45rem", border: "1px solid #DFE3E7", background: "#fff", color: SLATE, cursor: "pointer", fontSize: "0.85rem" }}>ביטול</button>
              </div>
            </div>)}
            {managerFiltered.length === 0 && !editingPartyId && <div style={{ textAlign: "center", color: "#9AA0A6", fontSize: "0.85rem", padding: "1.5rem 0" }}>אין עדיין רשומות. לחצו על "חדש" כדי להוסיף.</div>}
            {managerFiltered.map((p) => { const meta = partyTypeMeta(p.type); return (
              <div key={p.id} className="row-hover" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.55rem 0.3rem", borderBottom: "1px solid #EEF0F2" }}>
                <div><div style={{ fontSize: "0.88rem", fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: "0.7rem", color: meta.color }}>{meta.label}{p.phone ? ` · ${p.phone}` : ""}</div></div>
                <div style={{ display: "flex", gap: "0.4rem" }}><button onClick={() => startEditParty(p)} style={{ border: "none", background: "none", cursor: "pointer", color: SLATE }}><Pencil size={14} /></button><button onClick={() => deleteParty(p.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#C5453D" }}><Trash2 size={14} /></button></div>
              </div>
            ); })}
          </div>
        </div>
      )}

      {/* Report modal */}
      {showReport && (
        <div onClick={() => setShowReport(false)} style={modalBackdrop}>
          <div className="sheet-enter" onClick={(e) => e.stopPropagation()} style={{ ...modalCard, maxWidth: "40rem" }}>
            <ModalHeader title="מטריצת לקוחות וספקים" onClose={() => setShowReport(false)} />
            <div className="pill" onClick={() => setReportGroupByType((v) => !v)} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", color: ACCENT, border: `1px solid ${ACCENT}`, borderRadius: "0.4rem", padding: "0.3rem 0.7rem", marginBottom: "1rem" }}><ArrowUpDown size={13} />{reportGroupByType ? "מוצג: מקובץ לפי סוג" : "מוצג: כללי לפי א-ב"}</div>
            {Object.entries(reportGrouped).map(([groupId, rows]) => {
              if (!rows.length) return null;
              const groupLabel = groupId ? partyTypeMeta(groupId).label : "כל הרשומות";
              const groupColor = groupId ? partyTypeMeta(groupId).color : SLATE;
              return (
                <div key={groupId || "all"} style={{ marginBottom: "1.25rem" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: groupColor, marginBottom: "0.5rem" }}>{groupLabel}</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                    <thead><tr style={{ borderBottom: "1px solid #E4E7EB", color: SLATE, textAlign: "right" }}><th style={{ padding: "0.4rem" }}>שם</th><th style={{ padding: "0.4rem" }}>הכנסות</th><th style={{ padding: "0.4rem" }}>הוצאות</th><th style={{ padding: "0.4rem" }}>תנועות</th></tr></thead>
                    <tbody>{rows.map((r) => (<tr key={r.id} style={{ borderBottom: "1px solid #F5F6F7" }}><td style={{ padding: "0.4rem", fontWeight: 600 }}>{r.name}</td><td style={{ padding: "0.4rem", color: "#1E8E5A" }}>{r.income ? formatILS(r.income) : "—"}</td><td style={{ padding: "0.4rem", color: "#C5453D" }}>{r.expense ? formatILS(r.expense) : "—"}</td><td style={{ padding: "0.4rem", color: "#8A939C" }}>{r.count}</td></tr>))}</tbody>
                  </table>
                </div>
              );
            })}
            {!reportRows.length && <div style={{ textAlign: "center", color: "#9AA0A6", fontSize: "0.85rem", padding: "1.5rem 0" }}>אין עדיין נתונים להצגה.</div>}
          </div>
        </div>
      )}

      {/* Invoice list modal */}
      {showInvoiceList && (
        <div onClick={() => setShowInvoiceList(false)} style={modalBackdrop}>
          <div className="sheet-enter" onClick={(e) => e.stopPropagation()} style={{ ...modalCard, maxWidth: "44rem" }}>
            <ModalHeader title="חשבוניות" icon={Receipt} onClose={() => setShowInvoiceList(false)} />
            <button onClick={openInvoiceForm} style={{ display: "flex", alignItems: "center", gap: "0.4rem", border: "none", background: ACCENT, color: "#fff", borderRadius: "0.5rem", padding: "0.5rem 0.9rem", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", marginBottom: "1rem" }}><Plus size={15} /> חשבונית חדשה</button>
            {invoices.length === 0 && <div style={{ textAlign: "center", color: "#9AA0A6", fontSize: "0.85rem", padding: "1.5rem 0" }}>אין עדיין חשבוניות.</div>}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead><tr style={{ borderBottom: "1px solid #E4E7EB", color: SLATE, textAlign: "right" }}><th style={{ padding: "0.4rem" }}>מס'</th><th style={{ padding: "0.4rem" }}>לקוח</th><th style={{ padding: "0.4rem" }}>סכום</th><th style={{ padding: "0.4rem" }}>תאריך</th><th style={{ padding: "0.4rem" }}>סטטוס</th><th></th></tr></thead>
              <tbody>{invoices.map((v) => (
                <tr key={v.id} className="row-hover" style={{ borderBottom: "1px solid #F5F6F7", cursor: "pointer" }} onClick={() => openEditInvoiceForm(v)}>
                  <td style={{ padding: "0.4rem" }}>{v.number || "—"}</td><td style={{ padding: "0.4rem", fontWeight: 600 }}>{v.partyName}</td><td style={{ padding: "0.4rem" }}>{formatILS(v.amount)}</td><td style={{ padding: "0.4rem" }}>{v.date}</td>
                  <td style={{ padding: "0.4rem" }}><span style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem", borderRadius: "1rem", background: v.status === "שולמה" ? "#E8F7ED" : v.status === "בוטלה" ? "#FDECEC" : "#FFF3CD", color: v.status === "שולמה" ? "#1E8E5A" : v.status === "בוטלה" ? "#C5453D" : "#8A6D1E" }}>{v.status}</span></td>
                  <td style={{ padding: "0.4rem" }}><button onClick={(ev) => { ev.stopPropagation(); deleteInvoice(v.id); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#C5453D" }}><Trash2 size={14} /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoice form modal */}
      {showInvoiceForm && (
        <div onClick={() => setShowInvoiceForm(false)} style={modalBackdrop}>
          <div className="sheet-enter" onClick={(e) => e.stopPropagation()} style={{ ...modalCard, maxWidth: "26rem" }}>
            <ModalHeader title={editingInvoiceId ? "עריכת חשבונית" : "חשבונית חדשה"} color="#8E24AA" onClose={() => setShowInvoiceForm(false)} />
            <FieldLabel>מספר חשבונית (לא חובה)</FieldLabel><input value={invoiceForm.number} onChange={(e) => setInvoiceForm({ ...invoiceForm, number: e.target.value })} style={inputStyle} />
            <FieldLabel>לקוח</FieldLabel><input value={invoiceForm.partyName} onChange={(e) => setInvoiceForm({ ...invoiceForm, partyName: e.target.value })} style={inputStyle} />
            <FieldLabel>סכום</FieldLabel><input type="number" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} style={inputStyle} />
            <FieldLabel>תאריך</FieldLabel><input type="date" value={invoiceForm.date} onChange={(e) => setInvoiceForm({ ...invoiceForm, date: e.target.value })} style={inputStyle} />
            <FieldLabel>סטטוס</FieldLabel>
            <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.8rem" }}>{INVOICE_STATUSES.map((s) => <span key={s} className="pill" onClick={() => setInvoiceForm({ ...invoiceForm, status: s })} style={{ fontSize: "0.72rem", padding: "0.3rem 0.6rem", borderRadius: "0.4rem", border: invoiceForm.status === s ? `1px solid ${ACCENT}` : "1px solid #DFE3E7", background: invoiceForm.status === s ? "#E8EEFF" : "#fff", color: invoiceForm.status === s ? ACCENT : SLATE }}>{s}</span>)}</div>
            <FieldLabel>הערות</FieldLabel><textarea value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            {error && <div style={{ color: "#C5453D", fontSize: "0.8rem", marginBottom: "0.7rem", textAlign: "center" }}>{error}</div>}
            <button onClick={submitInvoice} style={{ width: "100%", padding: "0.85rem", borderRadius: "0.55rem", border: "none", background: "#8E24AA", color: "#fff", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer", marginTop: "0.4rem" }}>{editingInvoiceId ? "עדכון" : "שמירה"}</button>
            {editingInvoiceId && <button onClick={() => deleteInvoice(editingInvoiceId)} style={{ width: "100%", padding: "0.7rem", borderRadius: "0.55rem", border: "1px solid #E1E5EE", background: "#fff", color: "#C5453D", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", marginTop: "0.5rem" }}>מחיקה</button>}
          </div>
        </div>
      )}

      {/* Checks database modal */}
      {showChecksDb && (
        <div onClick={() => setShowChecksDb(false)} style={modalBackdrop}>
          <div className="sheet-enter" onClick={(e) => e.stopPropagation()} style={{ ...modalCard, maxWidth: "56rem" }}>
            <ModalHeader title="מסד המחאות" icon={Table2} onClose={() => setShowChecksDb(false)} />
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <button onClick={handlePrint} style={{ display: "flex", alignItems: "center", gap: "0.35rem", border: "1px solid #DFE3E7", background: "#fff", borderRadius: "0.5rem", padding: "0.4rem 0.8rem", fontSize: "0.78rem", cursor: "pointer" }}><Printer size={14} /> הדפסה</button>
              <button onClick={exportChecksCSV} style={{ display: "flex", alignItems: "center", gap: "0.35rem", border: "1px solid #DFE3E7", background: "#fff", borderRadius: "0.5rem", padding: "0.4rem 0.8rem", fontSize: "0.78rem", cursor: "pointer" }}><FileDown size={14} /> ייצוא CSV</button>
              <button onClick={() => setChecksFilters({})} style={{ display: "flex", alignItems: "center", gap: "0.35rem", border: "1px solid #DFE3E7", background: "#fff", borderRadius: "0.5rem", padding: "0.4rem 0.8rem", fontSize: "0.78rem", cursor: "pointer" }}><Filter size={14} /> איפוס סינון</button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem", minWidth: "640px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #E4E7EB", color: SLATE, textAlign: "right" }}>
                    {[{ key: "valueDate", label: "תאריך" }, { key: "amount", label: "סכום" }, { key: "partyName", label: "שם" }, { key: "checkNumber", label: "מס' צ'ק" }, { key: "bankBranch", label: "בנק/סניף" }, { key: "status", label: "סטטוס" }].map((col) => (
                      <th key={col.key} className="th-sort" onClick={() => toggleChecksSort(col.key)} style={{ padding: "0.4rem", cursor: "pointer" }}>{col.label} {checksSort.key === col.key ? (checksSort.dir === "asc" ? "▲" : "▼") : ""}</th>
                    ))}
                  </tr>
                  <tr>
                    {["valueDate", "amount", "partyName", "checkNumber", "bankBranch", "status"].map((k) => (
                      <th key={k} style={{ padding: "0.2rem" }}><input value={checksFilters[k] || ""} onChange={(e) => setChecksFilters({ ...checksFilters, [k]: e.target.value })} placeholder="סנן..." style={{ width: "100%", fontSize: "0.72rem", padding: "0.25rem 0.4rem", border: "1px solid #E1E5EE", borderRadius: "0.3rem" }} /></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {checksFiltered.map((e) => (
                    <tr key={e.id} className="row-hover" style={{ borderBottom: "1px solid #F5F6F7" }}>
                      <td style={{ padding: "0.4rem" }}>{e.valueDate}</td><td style={{ padding: "0.4rem" }}>{formatILS(e.amount)}</td><td style={{ padding: "0.4rem" }}>{e.partyName}</td><td style={{ padding: "0.4rem" }}>{e.checkNumber || "—"}</td><td style={{ padding: "0.4rem" }}>{e.bankBranch || "—"}</td><td style={{ padding: "0.4rem" }}>{e.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {checksFiltered.length === 0 && <div style={{ textAlign: "center", color: "#9AA0A6", fontSize: "0.85rem", padding: "1.5rem 0" }}>אין תנועות בצ'ק להצגה.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolbarBtn({ icon: Icon, label, onClick, accent }) {
  return <button onClick={onClick} className="tb-btn" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem", border: "none", background: "none", cursor: "pointer", padding: "0.4rem 0.7rem", borderRadius: "0.5rem", minWidth: "4.2rem" }}>
    <span style={{ width: "1.9rem", height: "1.9rem", borderRadius: "50%", background: accent ? "#1FA25A" : "#F1F3F8", color: accent ? "#fff" : ACCENT, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={15} /></span>
    <span style={{ fontSize: "0.68rem", color: INK, whiteSpace: "nowrap" }}>{label}</span>
  </button>;
}
function NavArrow({ children, onClick }) { return <button onClick={onClick} style={{ width: "1.8rem", height: "1.8rem", borderRadius: "50%", background: "#F1F3F8", border: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", color: SLATE, cursor: "pointer" }}>{children}</button>; }
function ShortcutBtn({ icon: Icon, label, color, onClick }) {
  return <button onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem", border: "1px solid #EEF0F2", background: "#fff", borderRadius: "0.6rem", padding: "0.6rem 0.3rem", cursor: "pointer" }}>
    <span style={{ width: "1.9rem", height: "1.9rem", borderRadius: "0.5rem", background: `${color}18`, color, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={15} /></span>
    <span style={{ fontSize: "0.65rem", color: INK }}>{label}</span>
  </button>;
}
function CalcBtn({ label, onClick, op, accent, muted, wide, style }) {
  return <button onClick={onClick} className="calc-btn" style={{ gridColumn: wide ? "span 2" : undefined, padding: "0.7rem 0", borderRadius: "0.5rem", border: "none", cursor: "pointer", fontSize: "1rem", fontWeight: 700, background: accent ? ACCENT : op ? "#F1F3F8" : muted ? "#FDECEC" : "#F8F9FA", color: accent ? "#fff" : op ? ACCENT : muted ? "#C5453D" : INK, ...style }}>{label}</button>;
}
function SideNavItem({ icon: Icon, label, active, onClick }) {
  return <div className="navitem" onClick={onClick} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.7rem 0.8rem", borderRadius: "0.6rem", color: active ? "#fff" : "#B9C2DA", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", background: active ? ACCENT : "transparent", boxShadow: active ? "0 4px 14px rgba(46,91,255,.4)" : "none" }}>
    <Icon size={15} /> {label}
  </div>;
}
function ModalHeader({ title, icon: Icon, color, onClose }) {
  return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
    <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: color || INK, display: "flex", alignItems: "center", gap: "0.4rem" }}>{Icon && <Icon size={18} color={color || ACCENT} />} {title}</h2>
    <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#80868B" }}><X size={20} /></button>
  </div>;
}

function MonthHero({ monthCursor, entries, reminders, categories, onPickDay }) {
  const gridStart = startOfWeek(startOfMonth(monthCursor));
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const dataByDay = {};
  for (const d of days) dataByDay[iso(d)] = { cats: new Set(), reminders: 0 };
  for (const e of entries) if (dataByDay[e.valueDate]) dataByDay[e.valueDate].cats.add(e.category);
  for (const r of reminders) if (dataByDay[r.date]) dataByDay[r.date].reminders++;
  const todayStr = todayISO();
  function catColor(id) { const c = categories.find((x) => x.id === id); return c ? c.color : "#999"; }
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: "0.3rem" }}>{DAY_LABELS.map((l) => <div key={l} style={{ textAlign: "center", fontSize: "0.7rem", color: "#9AA3B5", fontWeight: 700, padding: "0.2rem 0" }}>{l}</div>)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "0.3rem" }}>
        {days.map((d, i) => {
          const dIso = iso(d); const inMonth = d.getMonth() === monthCursor.getMonth(); const isToday = dIso === todayStr; const info = dataByDay[dIso];
          return (
            <div key={dIso} className="day-cell" onClick={() => onPickDay(d)} style={{ aspectRatio: "1", borderRadius: "0.6rem", background: isToday ? ACCENT : "#F7F8FB", opacity: inMonth ? 1 : 0.4, display: "flex", flexDirection: "column", alignItems: "flex-end", padding: "0.3rem", fontSize: "0.75rem", color: isToday ? "#fff" : "#3B4254", position: "relative", cursor: "pointer", fontWeight: isToday ? 800 : 400 }}>
              {d.getDate()}
              <div style={{ position: "absolute", bottom: "0.3rem", right: "0.3rem", left: "0.3rem", display: "flex", flexWrap: "wrap", gap: "2px", justifyContent: "flex-end" }}>
                {[...info.cats].slice(0, 4).map((cid) => <span key={cid} style={{ width: "6px", height: "6px", borderRadius: "50%", background: catColor(cid) }} />)}
                {info.reminders > 0 && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#F0B429" }} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayView({ date, periodEntries, reminders, categories, onEditEntry, onDeleteEntry, onEditReminder, onDeleteReminder, onContextMenuEntry, onContextMenuReminder }) {
  const dIso = iso(date);
  const dayReminders = reminders.filter((r) => r.date === dIso).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  return (
    <div style={{ padding: "0.5rem 0", display: "flex", flexDirection: "column", gap: "0.6rem", minHeight: "20rem" }}>
      {dayReminders.length === 0 && periodEntries.length === 0 && <div style={{ textAlign: "center", color: "#9AA0A6", fontSize: "0.85rem", padding: "3rem 0" }}>אין תנועות או תזכורות ביום זה.</div>}
      {dayReminders.map((r) => { const rs = reminderStatusMeta(r.status); return (
        <div key={r.id} onClick={() => onEditReminder(r)} onContextMenu={(ev) => onContextMenuReminder(ev, r)} style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: rs.color, borderRadius: "0.5rem", padding: "0.6rem 0.8rem", cursor: "pointer", color: "#fff" }}>
          <Bell size={15} /><div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{r.title}</div><div style={{ fontSize: "0.72rem", opacity: 0.9 }}>{r.time} · {rs.label}</div></div>
          <button onClick={(ev) => { ev.stopPropagation(); onDeleteReminder(r.id); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#fff", opacity: 0.85 }}><Trash2 size={14} /></button>
        </div>
      ); })}
      {periodEntries.map((e) => { const cat = categories.find((c) => c.id === e.category) || categories[categories.length - 1]; return (
        <div key={e.id} onClick={() => onEditEntry(e)} onContextMenu={(ev) => onContextMenuEntry(ev, e)} style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: entryStatusColor(e.status), borderRadius: "0.5rem", padding: "0.6rem 0.8rem", cursor: "pointer", color: "#fff" }}>
          <span style={{ width: "0.6rem", height: "0.6rem", borderRadius: "50%", background: cat.color, border: "1px solid rgba(255,255,255,.85)", flexShrink: 0 }} />
          <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{e.partyName || cat.label}</div><div style={{ fontSize: "0.72rem", opacity: 0.85 }}>{cat.label}{e.notes ? ` · ${e.notes}` : ""}</div></div>
          <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{formatILS(e.amount)}</div>
          <button onClick={(ev) => { ev.stopPropagation(); onDeleteEntry(e.id); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#fff", opacity: 0.8 }}><Trash2 size={14} /></button>
        </div>
      ); })}
    </div>
  );
}

function YearView({ yearCursor, periodEntries, onPickMonth }) {
  const totals = Array.from({ length: 12 }, () => ({ income: 0, expense: 0 }));
  for (const e of periodEntries) { const d = new Date(e.valueDate + "T00:00:00"); if (d.getFullYear() !== yearCursor) continue; if (e.amount > 0) totals[d.getMonth()].income += e.amount; else totals[d.getMonth()].expense += Math.abs(e.amount); }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem" }}>
      {totals.map((t, m) => { const name = new Intl.DateTimeFormat("he-IL", { month: "long" }).format(new Date(yearCursor, m, 1)); return (
        <div key={m} onClick={() => onPickMonth(new Date(yearCursor, m, 1))} style={{ border: "1px solid #EEF0F2", borderRadius: "0.6rem", padding: "0.7rem", cursor: "pointer" }}>
          <div style={{ fontWeight: 700, fontSize: "0.8rem", marginBottom: "0.4rem" }}>{name}</div>
          <div style={{ fontSize: "0.7rem", color: "#1E8E5A" }}>{`+${formatILS(t.income)}`}</div>
          <div style={{ fontSize: "0.7rem", color: "#C5453D" }}>{`-${formatILS(t.expense)}`}</div>
        </div>
      ); })}
    </div>
  );
}

function MiniCalendar({ monthCursor, onPick, weekStart }) {
  const first = startOfMonth(monthCursor); const startOffset = first.getDay();
  const daysInMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();
  const cells = []; for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(monthCursor.getFullYear(), monthCursor.getMonth(), d));
  const todayStr = todayISO(); const weekEnd = addDays(weekStart, 6);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: "0.2rem" }}>{DAY_LABELS.map((l) => <div key={l} style={{ textAlign: "center", fontSize: "0.6rem", color: "#9AA0A6", padding: "0.15rem 0" }}>{l}</div>)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px" }}>
        {cells.map((d, i) => { if (!d) return <div key={i} />; const dStr = iso(d); const isToday = dStr === todayStr; const inWeek = d >= weekStart && d <= weekEnd; return (
          <div key={i} onClick={() => onPick(d)} style={{ textAlign: "center", fontSize: "0.68rem", padding: "0.28rem 0", borderRadius: "0.3rem", background: isToday ? ACCENT : inWeek ? "#E8EEFF" : "transparent", color: isToday ? "#fff" : inWeek ? ACCENT : INK, fontWeight: isToday ? 700 : 400, cursor: "pointer" }}>{d.getDate()}</div>
        ); })}
      </div>
    </div>
  );
}

function FieldLabel({ children }) { return <div style={{ fontSize: "0.72rem", color: SLATE, margin: "0.55rem 0 0.25rem" }}>{children}</div>; }
const inputStyle = { width: "100%", padding: "0.55rem 0.7rem", borderRadius: "0.45rem", border: "1px solid #DFE3E7", background: "#F8F9FA", fontSize: "0.85rem", outline: "none", color: INK, marginBottom: "0.7rem" };
const ctxMenuBtnStyle = { display: "flex", alignItems: "center", gap: "0.5rem", width: "100%", padding: "0.6rem 0.9rem", border: "none", background: "#fff", cursor: "pointer", fontSize: "0.85rem", textAlign: "right", color: INK };
const modalBackdrop = { position: "fixed", inset: 0, background: "rgba(16,27,51,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" };
const modalCard = { width: "100%", maxWidth: "30rem", maxHeight: "90vh", overflowY: "auto", background: "#fff", borderRadius: "0.9rem", padding: "1.25rem", boxShadow: "0 12px 40px rgba(0,0,0,.2)" };
