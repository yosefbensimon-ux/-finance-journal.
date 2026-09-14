import { useState, useEffect, useMemo } from "react";
import {
  Plus, Minus, Search, CalendarPlus, BarChart3,
  X, ChevronRight, ChevronLeft, Paperclip, Trash2, ChevronDown,
  Users, ArrowUpDown, Pencil, Check, Bell, LogOut, Copy, Landmark, Clock
} from "lucide-react";
import { supabase } from "./supabaseClient";

const DEFAULT_CATEGORIES = [
  { id: "work_income", label: "הכנסות עבודה", color: "#33B679", kind: "income" },
  { id: "work_expense", label: "הוצאות עבודה", color: "#E67C73", kind: "expense" },
  { id: "loans", label: "הלוואות", color: "#F6BF26", kind: "expense" },
  { id: "arrangements", label: "הסדרים", color: "#8E24AA", kind: "expense" },
  { id: "misc", label: "שונות", color: "#616161", kind: "expense" },
];

const COLOR_SWATCHES = ["#7986CB", "#33B679", "#8E24AA", "#E67C73", "#F6BF26", "#F4511E", "#039BE5", "#616161", "#3F51B5", "#0B8043", "#D50000", "#C0CA33"];
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
function reminderStatusMeta(id) { return REMINDER_STATUSES.find((s) => s.id === id) || REMINDER_STATUSES[0]; }
const ACCENT = "#3B6FC7";
const INK = "#1F2328";
const SLATE = "#5B6470";

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

function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-label="לוגו לוח הבקרה הפיננסי">
      <defs>
        <linearGradient id="logoSplit" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3B6FC7" />
          <stop offset="0.52" stopColor="#3B6FC7" />
          <stop offset="0.52" stopColor="#1E8E5A" />
          <stop offset="1" stopColor="#1E8E5A" />
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
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES.map((c) => ({ ...c, visible: true })));
  const [loaded, setLoaded] = useState(false);

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

  const [contextMenu, setContextMenu] = useState(null);

  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [monthCursor, setMonthCursor] = useState(startOfMonth(new Date()));
  const [yearCursor, setYearCursor] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState("שבועי");
  const [partyFilter, setPartyFilter] = useState("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [fabOpen, setFabOpen] = useState(false);
  const [colorPickerFor, setColorPickerFor] = useState(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [entriesRes, partiesRes, remindersRes, settingsRes] = await Promise.all([
          supabase.from("entries").select("*").eq("user_id", userId).order("value_date", { ascending: false }),
          supabase.from("parties").select("*").eq("user_id", userId),
          supabase.from("reminders").select("*").eq("user_id", userId),
          supabase.from("settings").select("*").eq("user_id", userId).maybeSingle(),
        ]);
        if (entriesRes.error) throw entriesRes.error;
        if (partiesRes.error) throw partiesRes.error;
        if (remindersRes.error) throw remindersRes.error;
        setEntries((entriesRes.data || []).map(rowToEntry));
        setParties((partiesRes.data || []).map(rowToParty));
        setReminders((remindersRes.data || []).map(rowToReminder));
        const savedCats = settingsRes.data?.categories;
        if (Array.isArray(savedCats) && savedCats.length) {
          setCategories(DEFAULT_CATEGORIES.map((c) => {
            const s = savedCats.find((x) => x.id === c.id);
            return s ? { ...c, color: s.color || c.color, visible: s.visible !== false } : { ...c, visible: true };
          }));
        }
      } catch (e) {
        setError(e.message || "שגיאה בטעינת נתונים");
      } finally {
        setLoaded(true);
      }
    })();
  }, [userId]);

  async function addEntry(formData) {
    const { data, error } = await supabase.from("entries").insert(entryToRow(formData, userId)).select().single();
    if (error) { setError(error.message); return; }
    setEntries((prev) => [rowToEntry(data), ...prev]);
  }
  async function updateEntry(id, formData) {
    const { data, error } = await supabase.from("entries").update(entryToRow(formData, userId)).eq("id", id).select().single();
    if (error) { setError(error.message); return; }
    setEntries((prev) => prev.map((e) => (e.id === id ? rowToEntry(data) : e)));
  }
  async function deleteEntry(id) {
    const prev = entries;
    setEntries(entries.filter((e) => e.id !== id));
    const { error } = await supabase.from("entries").delete().eq("id", id);
    if (error) { setError(error.message); setEntries(prev); }
    if (editingEntryId === id) { setShowForm(false); setEditingEntryId(null); }
  }
  function duplicateEntry(entry) {
    const copy = { ...entry };
    delete copy.id;
    addEntry(copy);
    jumpToDate(new Date(copy.valueDate + "T12:00:00"));
  }

  async function addParty(p) {
    const { data, error } = await supabase.from("parties").insert(partyToRow(p, userId)).select().single();
    if (error) { setError(error.message); return null; }
    const created = rowToParty(data);
    setParties((prev) => [created, ...prev]);
    return created;
  }
  async function updateParty(id, p) {
    const { data, error } = await supabase.from("parties").update(partyToRow(p, userId)).eq("id", id).select().single();
    if (error) { setError(error.message); return; }
    setParties((prev) => prev.map((x) => (x.id === id ? rowToParty(data) : x)));
  }
  async function deleteParty(id) {
    const prev = parties;
    setParties(parties.filter((p) => p.id !== id));
    const { error } = await supabase.from("parties").delete().eq("id", id);
    if (error) { setError(error.message); setParties(prev); }
  }

  async function addReminder(r) {
    const { data, error } = await supabase.from("reminders").insert(reminderToRow(r, userId)).select().single();
    if (error) { setError(error.message); return; }
    setReminders((prev) => [rowToReminder(data), ...prev]);
  }
  async function updateReminder(id, r) {
    const { data, error } = await supabase.from("reminders").update(reminderToRow(r, userId)).eq("id", id).select().single();
    if (error) { setError(error.message); return; }
    setReminders((prev) => prev.map((x) => (x.id === id ? rowToReminder(data) : x)));
  }
  async function deleteReminder(id) {
    const prev = reminders;
    setReminders(reminders.filter((r) => r.id !== id));
    const { error } = await supabase.from("reminders").delete().eq("id", id);
    if (error) { setError(error.message); setReminders(prev); }
    if (editingReminderId === id) { setShowReminderForm(false); setEditingReminderId(null); }
  }
  function duplicateReminder(reminder) {
    const copy = { ...reminder };
    delete copy.id;
    addReminder(copy);
    jumpToDate(new Date(copy.date + "T12:00:00"));
  }
  function markReminderStatus(reminder, status) {
    updateReminder(reminder.id, { ...reminder, status });
  }

  async function persistCategories(next) {
    setCategories(next);
    const payload = next.map(({ id, color, visible }) => ({ id, color, visible }));
    const { error } = await supabase.from("settings").upsert({ user_id: userId, categories: payload, updated_at: new Date().toISOString() });
    if (error) setError(error.message);
  }

  function catById(id) { return categories.find((c) => c.id === id) || categories[categories.length - 1]; }
  function setCategoryColor(id, color) { persistCategories(categories.map((c) => (c.id === id ? { ...c, color } : c))); }
  function toggleCategoryVisible(id) { persistCategories(categories.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))); }

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
    if (editingEntryId) await updateEntry(editingEntryId, signed);
    else await addEntry(signed);
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

  function openReminderForm() {
    setEditingReminderId(null);
    setReminderForm(emptyReminder);
    setShowReminderForm(true);
    setFabOpen(false);
  }
  function openEditReminderForm(r) {
    setEditingReminderId(r.id);
    setReminderForm({ title: r.title, date: r.date, time: r.time || "09:00", repeat: r.repeat || "none", snooze: r.snooze || "none", notes: r.notes || "", status: r.status || "ongoing" });
    setError(""); setShowReminderForm(true); setFabOpen(false);
  }
  function closeReminderForm() { setShowReminderForm(false); setEditingReminderId(null); }
  async function saveReminder() {
    if (!reminderForm.title.trim() || !reminderForm.date) { setError("מלא כותרת ותאריך"); return; }
    if (editingReminderId) await updateReminder(editingReminderId, reminderForm);
    else await addReminder(reminderForm);
    jumpToDate(new Date(reminderForm.date + "T12:00:00"));
    setShowReminderForm(false);
    setEditingReminderId(null);
  }

  // ---- context menu (right click) ----
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
  const visibleCategoryIds = useMemo(() => new Set(categories.filter((c) => c.visible).map((c) => c.id)), [categories]);

  const filteredEntries = useMemo(() => {
    let list = entries.filter((e) => visibleCategoryIds.has(e.category));
    if (partyFilter !== "all") list = list.filter((e) => e.partyType === partyFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((e) => [e.partyName, e.notes, e.project, e.subCategory, e.tags].filter(Boolean).some((f) => f.toLowerCase().includes(q)));
    }
    return list;
  }, [entries, partyFilter, searchQuery, visibleCategoryIds]);

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

  // ---- period (view-mode aware) range used for totals / graph / day-month-year bodies ----
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
    if (viewMode === "שנתי") {
      return { start: `${yearCursor}-01-01`, end: `${yearCursor}-12-31`, label: String(yearCursor) };
    }
    const s = iso(weekStart), e = iso(addDays(weekStart, 6));
    return { start: s, end: e, label: `${fmtShort(weekStart)} – ${fmtShort(addDays(weekStart, 6))}` };
  }, [viewMode, weekAnchor, monthCursor, yearCursor, weekStart]);

  const periodEntries = useMemo(
    () => filteredEntries.filter((e) => e.valueDate >= periodRange.start && e.valueDate <= periodRange.end),
    [filteredEntries, periodRange]
  );
  const periodIncome = periodEntries.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const periodExpense = periodEntries.filter((e) => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);

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
    else if (viewMode === "שנתי") {
      const ny = yearCursor + delta;
      const d = new Date(ny, monthCursor.getMonth(), 1);
      setYearCursor(ny); setMonthCursor(startOfMonth(d)); setWeekAnchor(d);
    } else shiftWeek(delta);
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

  const fabActions = [
    { label: "הוספת הכנסה", icon: Plus, color: "#33B679", action: () => openForm("income") },
    { label: "הוספת הוצאה", icon: Minus, color: "#E67C73", action: () => openForm("expense") },
    { label: "הוספת תזכורת", icon: CalendarPlus, color: "#8E24AA", action: openReminderForm },
    { label: "רשומת לקוח/ספק", icon: Users, color: "#039BE5", action: startNewParty },
  ];

  if (!loaded) {
    return <div dir="rtl" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Assistant', sans-serif", color: SLATE }}>טוען נתונים...</div>;
  }

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#F1F3F8", fontFamily: "'Assistant', sans-serif", color: INK }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700&family=Frank+Ruhl+Libre:wght@600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin:0; }
        input, select, textarea { font-family: 'Assistant', sans-serif; }
        ::-webkit-scrollbar { width: 6px; height:6px; }
        ::-webkit-scrollbar-thumb { background: #C7CDDA; border-radius: 3px; }
        .menu-btn { transition: background 0.12s ease; cursor:pointer; }
        .menu-btn:hover { background: #EEF2FB; }
        .pill { transition: all 0.12s ease; cursor:pointer; }
        .chip { transition: transform 0.1s ease; cursor:pointer; }
        .chip:hover { transform: scale(1.02); }
        .sheet-enter { animation: slideup 0.2s cubic-bezier(0.2,0.8,0.2,1); }
        @keyframes slideup { from { transform: translateY(24px); opacity:0; } to { transform: translateY(0); opacity:1; } }
        .row-hover:hover { background: #F8F9FA; }
        .fab-item { animation: fabin 0.16s ease both; }
        @keyframes fabin { from { opacity:0; transform: translateY(6px) scale(0.9); } to { opacity:1; transform: translateY(0) scale(1); } }
        .fab-main { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .fab-main:active { transform: scale(0.94); }
        .seg { transition: all 0.15s ease; }
        .mini-cell { cursor:pointer; transition: background 0.12s ease; }
        .mini-cell:hover { background: #EEF2FB; }
        .swatch { cursor:pointer; transition: transform 0.1s ease; }
        .swatch:hover { transform: scale(1.15); }
        .month-cell:hover { background: #FAFBFD; }
        .year-card:hover { border-color: ${ACCENT}; }
      `}</style>

      {/* Top bar */}
      <div style={{ padding: "0.85rem 1.5rem", background: "#fff", borderBottom: `1px solid #E1E5EE`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.6rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <Logo size={36} />
          <h1 style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>לוח הבקרה הפיננסי</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: SLATE, fontSize: "0.85rem", fontVariantNumeric: "tabular-nums" }}>
          <Clock size={15} />
          <span>{now.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
        </div>
        {searchOpen && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "#F1F3F4", borderRadius: "0.6rem", padding: "0.4rem 0.8rem", flex: 1, maxWidth: "22rem", margin: "0 1rem" }}>
            <Search size={15} color="#80868B" />
            <input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="חיפוש..." style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: "0.85rem" }} />
            {searchQuery && <button onClick={() => setSearchQuery("")} style={{ border: "none", background: "none", cursor: "pointer", color: "#80868B" }}><X size={14} /></button>}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", fontSize: "0.85rem" }}>
          <span><span style={{ color: SLATE }}>{`הכנסות ${periodWordFor(viewMode)} `}</span><b style={{ color: "#1E8E5A" }}>{formatILS(periodIncome)}</b></span>
          <span><span style={{ color: SLATE }}>{`הוצאות ${periodWordFor(viewMode)} `}</span><b style={{ color: "#C5453D" }}>{formatILS(periodExpense)}</b></span>
          <button onClick={() => supabase.auth.signOut()} title="התנתקות" style={{ border: "none", background: "none", cursor: "pointer", color: SLATE, display: "flex", alignItems: "center" }}><LogOut size={17} /></button>
        </div>
      </div>

      {error && (
        <div style={{ background: "#FDECEA", color: "#C5453D", fontSize: "0.8rem", padding: "0.5rem 1.5rem", display: "flex", justifyContent: "space-between" }}>
          <span>{error}</span>
          <button onClick={() => setError("")} style={{ border: "none", background: "none", color: "#C5453D", cursor: "pointer" }}><X size={14} /></button>
        </div>
      )}

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.1rem", padding: "1.1rem 1.5rem", maxWidth: "1440px", margin: "0 auto" }}>

        {/* RIGHT THIRD: sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          <div style={{ background: "#fff", borderRadius: "0.6rem", border: "1px solid #E1E5EE", padding: "0.8rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <button onClick={() => setMonthCursor(addMonths(monthCursor, -1))} style={{ border: "none", background: "none", cursor: "pointer", color: SLATE }}><ChevronRight size={15} /></button>
              <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>{new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(monthCursor)}</span>
              <button onClick={() => setMonthCursor(addMonths(monthCursor, 1))} style={{ border: "none", background: "none", cursor: "pointer", color: SLATE }}><ChevronLeft size={15} /></button>
            </div>
            <MiniCalendar monthCursor={monthCursor} onPick={jumpToDate} weekStart={weekStart} />
          </div>

          <div style={{ background: "#fff", borderRadius: "0.6rem", border: "1px solid #E1E5EE" }}>
            <SectionLabel>הקטגוריות שלי</SectionLabel>
            <div style={{ padding: "0 0.9rem 0.8rem" }}>
              {categories.map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.55rem", padding: "0.3rem 0", position: "relative" }}>
                  <div onClick={() => toggleCategoryVisible(c.id)} style={{ width: "1rem", height: "1rem", borderRadius: "0.25rem", background: c.visible ? c.color : "#fff", border: `1.5px solid ${c.color}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
                    {c.visible && <Check size={11} color="#fff" strokeWidth={3} />}
                  </div>
                  <span onClick={() => toggleCategoryVisible(c.id)} style={{ fontSize: "0.82rem", color: c.visible ? INK : "#B0B6BF", cursor: "pointer", flex: 1 }}>{c.label}</span>
                  <div onClick={() => setColorPickerFor(colorPickerFor === c.id ? null : c.id)} className="swatch" title="שינוי צבע" style={{ width: "0.9rem", height: "0.9rem", borderRadius: "50%", background: c.color, flexShrink: 0, border: "1px solid rgba(0,0,0,0.1)" }} />
                  {colorPickerFor === c.id && (
                    <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 20, background: "#fff", border: "1px solid #E1E5EE", borderRadius: "0.5rem", padding: "0.6rem", boxShadow: "0 6px 18px rgba(0,0,0,0.15)", display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "0.4rem", width: "10rem" }}>
                      {COLOR_SWATCHES.map((sw) => (
                        <div key={sw} className="swatch" onClick={() => { setCategoryColor(c.id, sw); setColorPickerFor(null); }} style={{ width: "1.1rem", height: "1.1rem", borderRadius: "50%", background: sw, border: sw === c.color ? "2px solid #1F2328" : "1px solid rgba(0,0,0,0.1)" }} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: "0.6rem", border: "1px solid #E1E5EE" }}>
            <SectionLabel>תצוגה</SectionLabel>
            <div style={{ display: "flex", padding: "0 0.9rem 0.9rem", gap: "0.3rem" }}>
              {VIEW_MODES.map((v) => (
                <span key={v} className="seg" onClick={() => setViewMode(v)} style={{ flex: 1, textAlign: "center", fontSize: "0.74rem", padding: "0.4rem 0.2rem", borderRadius: "0.4rem", background: viewMode === v ? ACCENT : "#EEF2FB", color: viewMode === v ? "#fff" : SLATE, cursor: "pointer" }}>{v}</span>
              ))}
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: "0.6rem", border: "1px solid #E1E5EE" }}>
            <SectionLabel>סינון לפי סוג צד</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", padding: "0 0.9rem 0.9rem" }}>
              {PARTY_FILTER_OPTIONS.map((p) => (
                <span key={p.id} className="pill" onClick={() => setPartyFilter(p.id)} style={{ fontSize: "0.72rem", padding: "0.3rem 0.65rem", borderRadius: "0.4rem", border: partyFilter === p.id ? `1px solid ${ACCENT}` : "1px solid #DFE3E7", background: partyFilter === p.id ? "#EAF0FC" : "#fff", color: partyFilter === p.id ? ACCENT : SLATE }}>{p.label}</span>
              ))}
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: "0.6rem", border: "1px solid #E1E5EE" }}>
            <SectionLabel>ניהול</SectionLabel>
            <MenuRow icon={Search} label="חיפוש" onClick={() => setSearchOpen((v) => !v)} />
            <MenuRow icon={Users} label="לקוחות וספקים" onClick={() => { setShowPartyManager(true); setEditingPartyId(null); }} />
            <MenuRow icon={BarChart3} label="דוחות" onClick={() => setShowReport(true)} />
            <MenuRow icon={CalendarPlus} label="הוספת תזכורת" onClick={openReminderForm} />
          </div>
        </div>

        {/* LEFT area: graph + calendar */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.7fr", gap: "1.1rem" }}>

          <div style={{ background: "#fff", borderRadius: "0.6rem", border: "1px solid #E1E5EE", padding: "1rem", height: "fit-content" }}>
            <div style={{ fontSize: "0.76rem", fontWeight: 700, color: SLATE, marginBottom: "0.9rem" }}>לפי קטגוריה · {periodRange.label}</div>
            {maxCatTotal > 1 && (
              <div style={{ position: "relative", width: 150, height: 150, margin: "0 auto 1.2rem" }}>
                <DonutChart data={categoryTotals.filter((c) => c.visible).map((c) => ({ value: c.total, color: c.color }))} size={150} strokeWidth={24} />
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontSize: "0.62rem", color: "#8A939C" }}>סה"כ</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 700, color: INK }}>{formatILS(categoryTotals.filter((c) => c.visible).reduce((s, c) => s + c.total, 0))}</div>
                </div>
              </div>
            )}
            {categoryTotals.filter((c) => c.visible).map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
                <span style={{ fontSize: "0.72rem", color: SLATE, width: "5.4rem", flexShrink: 0 }}>{c.label}</span>
                <div style={{ flex: 1, height: "7px", background: "#EEF0F2", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ width: `${(c.total / maxCatTotal) * 100}%`, height: "100%", background: c.color, borderRadius: "4px" }} />
                </div>
                <span style={{ fontSize: "0.68rem", color: "#8A939C", width: "3.4rem", textAlign: "left" }}>{formatILS(c.total)}</span>
              </div>
            ))}
            {periodEntries.length === 0 && <div style={{ fontSize: "0.75rem", color: "#9AA0A6", marginTop: "0.5rem" }}>{noEntriesMessage(viewMode)}</div>}
          </div>

          <div style={{ background: "#fff", borderRadius: "0.6rem", border: "1px solid #E1E5EE", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.7rem 1rem", borderBottom: "1px solid #EEF0F2" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button onClick={() => shiftPeriod(-1)} style={{ border: "none", background: "none", cursor: "pointer", color: SLATE }}><ChevronRight size={18} /></button>
                <span style={{ fontWeight: 700, fontSize: "0.92rem" }}>{periodRange.label}</span>
                <button onClick={() => shiftPeriod(1)} style={{ border: "none", background: "none", cursor: "pointer", color: SLATE }}><ChevronLeft size={18} /></button>
              </div>
              <span className="pill" onClick={goToday} style={{ fontSize: "0.72rem", color: ACCENT, padding: "0.25rem 0.6rem", border: `1px solid ${ACCENT}`, borderRadius: "0.4rem" }}>היום</span>
            </div>

            {viewMode === "שבועי" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", minHeight: "26rem" }}>
                {weekDays.map((d, i) => {
                  const dIso = iso(d);
                  const dayEntries = entriesByDay[dIso] || [];
                  const isToday = dIso === todayISO();
                  return (
                    <div key={dIso} style={{ borderRight: i < 6 ? "1px solid #EEF0F2" : "none", display: "flex", flexDirection: "column" }}>
                      <div style={{ textAlign: "center", padding: "0.5rem 0", borderBottom: "1px solid #EEF0F2", background: isToday ? "#EAF0FC" : "#FAFBFD" }}>
                        <div style={{ fontSize: "0.66rem", color: "#8A939C" }}>{DAY_LABELS[i]}</div>
                        <div style={{ fontSize: "0.85rem", fontWeight: isToday ? 700 : 500, color: isToday ? ACCENT : "#3C4043" }}>{d.getDate()}</div>
                      </div>
                      <div style={{ flex: 1, padding: "0.3rem", display: "flex", flexDirection: "column", gap: "0.25rem", overflowY: "auto" }}>
                        {(remindersByDay[dIso] || []).map((r) => {
                          const rs = reminderStatusMeta(r.status);
                          return (
                            <div key={r.id} className="chip" title="לחצו לעריכה, קליק ימני לאפשרויות" onClick={() => openEditReminderForm(r)} onContextMenu={(ev) => openContextMenu(ev, "reminder", r)} style={{ background: rs.color, borderRadius: "0.3rem", padding: "0.28rem 0.4rem", fontSize: "0.6rem", position: "relative", color: "#fff" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontWeight: 700 }}><Bell size={9} />{r.time}</div>
                              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</div>
                              <button onClick={(ev) => { ev.stopPropagation(); deleteReminder(r.id); }} style={{ position: "absolute", top: "2px", left: "2px", border: "none", background: "none", cursor: "pointer", color: "#fff", opacity: 0.75, padding: 0 }}><Trash2 size={9} /></button>
                            </div>
                          );
                        })}
                        {dayEntries.map((e) => {
                          const cat = catById(e.category);
                          return (
                            <div key={e.id} className="chip" title="לחצו לעריכה, קליק ימני לאפשרויות" onClick={() => openEditForm(e)} onContextMenu={(ev) => openContextMenu(ev, "entry", e)} style={{ background: cat.color, borderRadius: "0.3rem", padding: "0.3rem 0.4rem", fontSize: "0.62rem", position: "relative", color: "#fff" }}>
                              <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.partyName || cat.label}</div>
                              <div style={{ fontWeight: 700, opacity: 0.95 }}>{formatILS(e.amount)}</div>
                              <button onClick={(ev) => { ev.stopPropagation(); deleteEntry(e.id); }} style={{ position: "absolute", top: "2px", left: "2px", border: "none", background: "none", cursor: "pointer", color: "#fff", opacity: 0.75, padding: 0 }}><Trash2 size={10} /></button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === "יומי" && (
              <DayView
                date={weekAnchor}
                periodEntries={periodEntries}
                reminders={reminders}
                categories={categories}
                onEditEntry={openEditForm}
                onDeleteEntry={deleteEntry}
                onEditReminder={openEditReminderForm}
                onDeleteReminder={deleteReminder}
                onContextMenuEntry={(ev, item) => openContextMenu(ev, "entry", item)}
                onContextMenuReminder={(ev, item) => openContextMenu(ev, "reminder", item)}
              />
            )}

            {viewMode === "חודשי" && (
              <MonthView
                monthCursor={monthCursor}
                periodEntries={periodEntries}
                reminders={reminders}
                onPickDay={(d) => { jumpToDate(d); setViewMode("יומי"); }}
              />
            )}

            {viewMode === "שנתי" && (
              <YearView
                yearCursor={yearCursor}
                periodEntries={periodEntries}
                onPickMonth={(d) => { jumpToDate(d); setViewMode("חודשי"); }}
              />
            )}
          </div>
        </div>
      </div>

      {/* FAB */}
      <div style={{ position: "fixed", bottom: "1.6rem", left: "1.6rem", display: "flex", flexDirection: "column-reverse", alignItems: "flex-start", gap: "0.6rem", zIndex: 200 }}>
        <button className="fab-main" onClick={() => setFabOpen((v) => !v)} aria-label="פעולה חדשה" style={{ width: "3.4rem", height: "3.4rem", borderRadius: "50%", background: ACCENT, border: "none", boxShadow: "0 6px 18px rgba(59,111,199,0.4)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Plus size={24} color="#fff" style={{ transform: fabOpen ? "rotate(45deg)" : "none", transition: "transform 0.15s ease" }} />
        </button>
        {fabOpen && fabActions.map((a, idx) => {
          const Icon = a.icon;
          return (
            <button key={a.label} className="fab-item" onClick={a.action} style={{ animationDelay: `${idx * 0.03}s`, display: "flex", alignItems: "center", gap: "0.6rem", background: "#fff", border: "1px solid #E1E5EE", borderRadius: "2rem", padding: "0.5rem 0.9rem 0.5rem 0.6rem", boxShadow: "0 3px 10px rgba(0,0,0,0.1)", cursor: "pointer" }}>
              <span style={{ width: "1.7rem", height: "1.7rem", borderRadius: "50%", background: a.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={13} color="#fff" /></span>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: INK, whiteSpace: "nowrap" }}>{a.label}</span>
            </button>
          );
        })}
      </div>
      {fabOpen && <div onClick={() => setFabOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 35 }} />}
      {colorPickerFor && <div onClick={() => setColorPickerFor(null)} style={{ position: "fixed", inset: 0, zIndex: 15 }} />}

      {/* Right-click context menu */}
      {contextMenu && (
        <div onClick={closeContextMenu} onContextMenu={(ev) => { ev.preventDefault(); closeContextMenu(); }} style={{ position: "fixed", inset: 0, zIndex: 90 }}>
          <div onClick={(ev) => ev.stopPropagation()} style={{ position: "fixed", top: contextMenu.y, left: contextMenu.x, zIndex: 91, background: "#fff", border: "1px solid #E1E5EE", borderRadius: "0.6rem", boxShadow: "0 8px 24px rgba(0,0,0,0.18)", minWidth: "10rem", overflow: "hidden" }}>
            {contextMenu.kind === "reminder" && (
              <>
                {REMINDER_STATUSES.map((s) => (
                  <button key={s.id} onClick={() => { markReminderStatus(contextMenu.item, s.id); closeContextMenu(); }} className="menu-btn" style={ctxMenuBtnStyle}>
                    <span style={{ width: "0.7rem", height: "0.7rem", borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                    {`סמן כ${s.label}`}
                  </button>
                ))}
                <div style={{ borderTop: "1px solid #EEF0F2" }} />
              </>
            )}
            <button onClick={handleMenuEdit} className="menu-btn" style={ctxMenuBtnStyle}><Pencil size={14} /> עריכה</button>
            <button onClick={handleMenuDuplicate} className="menu-btn" style={ctxMenuBtnStyle}><Copy size={14} /> שכפול</button>
            <button onClick={handleMenuDelete} className="menu-btn" style={{ ...ctxMenuBtnStyle, color: "#C5453D" }}><Trash2 size={14} /> מחיקה</button>
          </div>
        </div>
      )}

      {/* Add/edit transaction sheet */}
      {showForm && (
        <div onClick={closeForm} style={{ position: "fixed", inset: 0, background: "rgba(31,35,40,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }}>
          <div className="sheet-enter" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "30rem", maxHeight: "90vh", overflowY: "auto", background: "#fff", borderRadius: "0.9rem", padding: "1.25rem", boxShadow: "0 12px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: form.type === "income" ? "#1E8E5A" : "#C5453D" }}>
                {editingEntryId ? (form.type === "income" ? "עריכת הכנסה" : "עריכת הוצאה") : (form.type === "income" ? "הוספת הכנסה" : "הוספת הוצאה")}
              </h2>
              <button onClick={closeForm} style={{ border: "none", background: "none", cursor: "pointer", color: "#80868B" }}><X size={20} /></button>
            </div>

            <FieldLabel>סכום</FieldLabel>
            <input type="number" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" style={inputStyle} />

            <div style={{ display: "flex", gap: "0.6rem" }}>
              <div style={{ flex: 1 }}><FieldLabel>תאריך ערך</FieldLabel><input type="date" value={form.valueDate} onChange={(e) => setForm({ ...form, valueDate: e.target.value })} style={inputStyle} /></div>
              <div style={{ flex: 1 }}><FieldLabel>תאריך פירעון בפועל</FieldLabel><input type="date" value={form.actualDate} onChange={(e) => setForm({ ...form, actualDate: e.target.value })} style={inputStyle} /></div>
            </div>

            <FieldLabel>קטגוריה</FieldLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.8rem" }}>
              {categories.map((c) => (
                <span key={c.id} className="pill" onClick={() => setForm({ ...form, category: c.id })} style={{ fontSize: "0.75rem", padding: "0.35rem 0.7rem", borderRadius: "0.4rem", border: form.category === c.id ? `1px solid ${c.color}` : "1px solid #DFE3E7", background: form.category === c.id ? c.color : "#fff", color: form.category === c.id ? "#fff" : SLATE }}>{c.label}</span>
              ))}
            </div>

            <FieldLabel>ספק / לקוח / קבלן / עובד</FieldLabel>
            <div style={{ position: "relative", marginBottom: "0.7rem" }}>
              <input value={partyQuery} onChange={(e) => { setPartyQuery(e.target.value); setShowPartyDropdown(true); setForm({ ...form, partyId: "", partyName: e.target.value }); }} onFocus={() => setShowPartyDropdown(true)} placeholder="הקלד לחיפוש או ליצירת רשומה חדשה" style={{ ...inputStyle, marginBottom: 0 }} />
              {showPartyDropdown && (
                <div style={{ position: "absolute", top: "100%", right: 0, left: 0, background: "#fff", border: "1px solid #DFE3E7", borderRadius: "0.5rem", marginTop: "0.25rem", maxHeight: "10rem", overflowY: "auto", zIndex: 10, boxShadow: "0 4px 14px rgba(0,0,0,0.1)" }}>
                  {partyMatches.map((p) => {
                    const meta = partyTypeMeta(p.type);
                    return <div key={p.id} className="row-hover" onClick={() => pickParty(p)} style={{ padding: "0.5rem 0.7rem", cursor: "pointer", display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}><span>{p.name}</span><span style={{ color: meta.color, fontSize: "0.7rem" }}>{meta.label}</span></div>;
                  })}
                  {partyQuery.trim() && !parties.some((p) => p.name === partyQuery.trim()) && (
                    <div className="row-hover" onClick={quickAddParty} style={{ padding: "0.5rem 0.7rem", cursor: "pointer", fontSize: "0.82rem", color: ACCENT, borderTop: partyMatches.length ? "1px solid #EEF0F2" : "none" }}>+ הוספת "{partyQuery.trim()}" כרשומה חדשה</div>
                  )}
                  {!partyMatches.length && !partyQuery.trim() && <div style={{ padding: "0.5rem 0.7rem", fontSize: "0.78rem", color: "#9AA0A6" }}>הקלידו שם לחיפוש</div>}
                </div>
              )}
            </div>

            <FieldLabel>סוג</FieldLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.8rem" }}>
              {PARTY_TYPES.map((t) => (
                <span key={t.id} className="pill" onClick={() => setForm({ ...form, partyType: t.id })} style={{ fontSize: "0.72rem", padding: "0.3rem 0.6rem", borderRadius: "0.4rem", border: form.partyType === t.id ? `1px solid ${t.color}` : "1px solid #DFE3E7", background: form.partyType === t.id ? `${t.color}18` : "#fff", color: form.partyType === t.id ? t.color : SLATE }}>{t.label}</span>
              ))}
            </div>

            <FieldLabel>אמצעי תשלום</FieldLabel>
            <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} style={inputStyle}>{PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}</select>

            <FieldLabel>עבור מה / פרויקט</FieldLabel>
            <input value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} placeholder="תיאור" style={inputStyle} />

            <div onClick={() => setShowMore((v) => !v)} style={{ display: "flex", alignItems: "center", gap: "0.3rem", cursor: "pointer", color: ACCENT, fontSize: "0.8rem", margin: "0.6rem 0 0.9rem" }}>
              <ChevronDown size={15} style={{ transform: showMore ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
              {showMore ? "פחות פרטים" : "עוד פרטים (צ׳ק, אסמכתא, סטטוס, התאמת בנק...)"}
            </div>

            {showMore && (
              <div>
                {form.paymentMethod === "צ'ק" && (
                  <div style={{ display: "flex", gap: "0.6rem" }}>
                    <div style={{ flex: 1 }}><FieldLabel>מספר צ׳ק</FieldLabel><input value={form.checkNumber} onChange={(e) => setForm({ ...form, checkNumber: e.target.value })} style={inputStyle} /></div>
                    <div style={{ flex: 1 }}><FieldLabel>בנק וסניף</FieldLabel><input value={form.bankBranch} onChange={(e) => setForm({ ...form, bankBranch: e.target.value })} style={inputStyle} /></div>
                  </div>
                )}
                <FieldLabel>מספר אסמכתא / חשבונית</FieldLabel>
                <input value={form.refNumber} onChange={(e) => setForm({ ...form, refNumber: e.target.value })} style={inputStyle} />
                <FieldLabel>תת־קטגוריה</FieldLabel>
                <input value={form.subCategory} onChange={(e) => setForm({ ...form, subCategory: e.target.value })} style={inputStyle} />
                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <div style={{ flex: 1 }}><FieldLabel>סטטוס</FieldLabel><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inputStyle}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                  <div style={{ flex: 1 }}><FieldLabel>סוג תשלום</FieldLabel>
                    <select value={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.value })} style={inputStyle}>
                      <option value="חד־פעמי">חד־פעמי</option><option value="הוראת קבע">הוראת קבע</option><option value="תשלומים">תשלומים</option>
                    </select>
                  </div>
                </div>
                {form.recurring === "תשלומים" && (
                  <div style={{ display: "flex", gap: "0.6rem" }}>
                    <div style={{ flex: 1 }}><FieldLabel>תשלום מספר</FieldLabel><input type="number" value={form.installmentNum} onChange={(e) => setForm({ ...form, installmentNum: e.target.value })} style={inputStyle} /></div>
                    <div style={{ flex: 1 }}><FieldLabel>מתוך</FieldLabel><input type="number" value={form.installmentTotal} onChange={(e) => setForm({ ...form, installmentTotal: e.target.value })} style={inputStyle} /></div>
                  </div>
                )}
                <FieldLabel>תגיות (מופרדות בפסיק)</FieldLabel>
                <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} style={inputStyle} />
                <FieldLabel>הערות</FieldLabel>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} />

                <div style={{ marginTop: "0.6rem", marginBottom: "0.6rem", padding: "0.7rem", background: "#F8F9FA", borderRadius: "0.5rem", border: "1px solid #EEF0F2" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", fontWeight: 700, color: SLATE, marginBottom: "0.5rem" }}>
                    <Landmark size={14} /> התאמות בנק
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={form.bankReconciled} onChange={(e) => setForm({ ...form, bankReconciled: e.target.checked, reconciliationDate: e.target.checked ? (form.reconciliationDate || todayISO()) : "" })} />
                    הותאם מול דף חשבון הבנק
                  </label>
                  {form.bankReconciled && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <FieldLabel>תאריך ההתאמה</FieldLabel>
                      <input type="date" value={form.reconciliationDate} onChange={(e) => setForm({ ...form, reconciliationDate: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }} />
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: "#80868B", marginBottom: "0.8rem" }}><Paperclip size={14} /> צירוף קובץ/קבלה — יתווסף בהמשך</div>
              </div>
            )}

            {error && <div style={{ color: "#C5453D", fontSize: "0.8rem", marginBottom: "0.7rem", textAlign: "center" }}>{error}</div>}
            <button onClick={submitForm} style={{ width: "100%", padding: "0.85rem", borderRadius: "0.55rem", border: "none", background: form.type === "income" ? "#1E8E5A" : "#C5453D", color: "#fff", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer", marginTop: "0.4rem" }}>{editingEntryId ? "עדכון" : "שמירה"}</button>
            {editingEntryId && (
              <button onClick={() => deleteEntry(editingEntryId)} style={{ width: "100%", padding: "0.7rem", borderRadius: "0.55rem", border: "1px solid #E1E5EE", background: "#fff", color: "#C5453D", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", marginTop: "0.5rem" }}>מחיקת רשומה</button>
            )}
          </div>
        </div>
      )}

      {/* Add/edit reminder modal */}
      {showReminderForm && (
        <div onClick={closeReminderForm} style={{ position: "fixed", inset: 0, background: "rgba(31,35,40,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }}>
          <div className="sheet-enter" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "26rem", maxHeight: "90vh", overflowY: "auto", background: "#fff", borderRadius: "0.9rem", padding: "1.25rem", boxShadow: "0 12px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "#8E24AA" }}>{editingReminderId ? "עריכת תזכורת" : "הוספת תזכורת"}</h2>
              <button onClick={closeReminderForm} style={{ border: "none", background: "none", cursor: "pointer", color: "#80868B" }}><X size={20} /></button>
            </div>
            <FieldLabel>כותרת</FieldLabel>
            <input value={reminderForm.title} onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })} placeholder='למשל: תשלום לספק, פגישה...' style={inputStyle} />
            <div style={{ display: "flex", gap: "0.6rem" }}>
              <div style={{ flex: 1 }}><FieldLabel>יום</FieldLabel><input type="date" value={reminderForm.date} onChange={(e) => setReminderForm({ ...reminderForm, date: e.target.value })} style={inputStyle} /></div>
              <div style={{ flex: 1 }}><FieldLabel>שעה</FieldLabel><input type="time" value={reminderForm.time} onChange={(e) => setReminderForm({ ...reminderForm, time: e.target.value })} style={inputStyle} /></div>
            </div>
            <FieldLabel>סטטוס</FieldLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.8rem" }}>
              {REMINDER_STATUSES.map((s) => (
                <span key={s.id} className="pill" onClick={() => setReminderForm({ ...reminderForm, status: s.id })} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.72rem", padding: "0.3rem 0.6rem", borderRadius: "0.4rem", border: reminderForm.status === s.id ? `1px solid ${s.color}` : "1px solid #DFE3E7", background: reminderForm.status === s.id ? `${s.color}18` : "#fff", color: reminderForm.status === s.id ? s.color : SLATE }}>
                  <span style={{ width: "0.6rem", height: "0.6rem", borderRadius: "50%", background: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>

            <FieldLabel>חזרתיות</FieldLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.8rem" }}>
              {REPEAT_OPTIONS.map((o) => (
                <span key={o.id} className="pill" onClick={() => setReminderForm({ ...reminderForm, repeat: o.id })} style={{ fontSize: "0.72rem", padding: "0.3rem 0.6rem", borderRadius: "0.4rem", border: reminderForm.repeat === o.id ? `1px solid ${ACCENT}` : "1px solid #DFE3E7", background: reminderForm.repeat === o.id ? "#EAF0FC" : "#fff", color: reminderForm.repeat === o.id ? ACCENT : SLATE }}>{o.label}</span>
              ))}
            </div>
            <FieldLabel>נודניק (תזכורת חוזרת עד לאישור)</FieldLabel>
            <select value={reminderForm.snooze} onChange={(e) => setReminderForm({ ...reminderForm, snooze: e.target.value })} style={inputStyle}>{SNOOZE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
            <FieldLabel>הערות</FieldLabel>
            <textarea value={reminderForm.notes} onChange={(e) => setReminderForm({ ...reminderForm, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            {error && <div style={{ color: "#C5453D", fontSize: "0.8rem", marginBottom: "0.7rem", textAlign: "center" }}>{error}</div>}
            <button onClick={saveReminder} style={{ width: "100%", padding: "0.85rem", borderRadius: "0.55rem", border: "none", background: "#8E24AA", color: "#fff", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer", marginTop: "0.4rem" }}>{editingReminderId ? "עדכון תזכורת" : "שמירת תזכורת"}</button>
            {editingReminderId && (
              <button onClick={() => deleteReminder(editingReminderId)} style={{ width: "100%", padding: "0.7rem", borderRadius: "0.55rem", border: "1px solid #E1E5EE", background: "#fff", color: "#C5453D", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", marginTop: "0.5rem" }}>מחיקת תזכורת</button>
            )}
          </div>
        </div>
      )}

      {/* Party manager modal */}
      {showPartyManager && (
        <div onClick={() => { setShowPartyManager(false); setEditingPartyId(null); }} style={{ position: "fixed", inset: 0, background: "rgba(31,35,40,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }}>
          <div className="sheet-enter" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "34rem", maxHeight: "90vh", overflowY: "auto", background: "#fff", borderRadius: "0.9rem", padding: "1.25rem", boxShadow: "0 12px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>לקוחות, ספקים, קבלנים ועובדים</h2>
              <button onClick={() => { setShowPartyManager(false); setEditingPartyId(null); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#80868B" }}><X size={20} /></button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {[{ id: "all", label: "הכל" }, ...PARTY_TYPES].map((t) => (
                  <span key={t.id} className="pill" onClick={() => setManagerTypeFilter(t.id)} style={{ fontSize: "0.72rem", padding: "0.3rem 0.6rem", borderRadius: "0.4rem", border: managerTypeFilter === t.id ? `1px solid ${ACCENT}` : "1px solid #DFE3E7", background: managerTypeFilter === t.id ? "#EAF0FC" : "#fff", color: managerTypeFilter === t.id ? ACCENT : SLATE }}>{t.label}</span>
                ))}
              </div>
              <button onClick={() => { setEditingPartyId("new"); setPartyForm(emptyParty); }} style={{ display: "flex", alignItems: "center", gap: "0.3rem", border: "none", background: ACCENT, color: "#fff", borderRadius: "0.45rem", padding: "0.4rem 0.7rem", fontSize: "0.78rem", cursor: "pointer", flexShrink: 0 }}><Plus size={14} /> חדש</button>
            </div>

            {editingPartyId && (
              <div style={{ background: "#F8F9FA", borderRadius: "0.55rem", padding: "0.9rem", marginBottom: "1rem", border: "1px solid #E4E7EB" }}>
                <FieldLabel>שם</FieldLabel>
                <input value={partyForm.name} onChange={(e) => setPartyForm({ ...partyForm, name: e.target.value })} style={inputStyle} />
                <FieldLabel>סוג</FieldLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.7rem" }}>
                  {PARTY_TYPES.map((t) => (
                    <span key={t.id} className="pill" onClick={() => setPartyForm({ ...partyForm, type: t.id })} style={{ fontSize: "0.72rem", padding: "0.3rem 0.6rem", borderRadius: "0.4rem", border: partyForm.type === t.id ? `1px solid ${t.color}` : "1px solid #DFE3E7", background: partyForm.type === t.id ? `${t.color}18` : "#fff", color: partyForm.type === t.id ? t.color : SLATE }}>{t.label}</span>
                  ))}
                </div>
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
              </div>
            )}

            {managerFiltered.length === 0 && !editingPartyId && <div style={{ textAlign: "center", color: "#9AA0A6", fontSize: "0.85rem", padding: "1.5rem 0" }}>אין עדיין רשומות. לחצו על "חדש" כדי להוסיף.</div>}
            {managerFiltered.map((p) => {
              const meta = partyTypeMeta(p.type);
              return (
                <div key={p.id} className="row-hover" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.55rem 0.3rem", borderBottom: "1px solid #EEF0F2" }}>
                  <div><div style={{ fontSize: "0.88rem", fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: "0.7rem", color: meta.color }}>{meta.label}{p.phone ? ` · ${p.phone}` : ""}</div></div>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button onClick={() => startEditParty(p)} style={{ border: "none", background: "none", cursor: "pointer", color: SLATE }}><Pencil size={14} /></button>
                    <button onClick={() => deleteParty(p.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#C5453D" }}><Trash2 size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Report matrix modal */}
      {showReport && (
        <div onClick={() => setShowReport(false)} style={{ position: "fixed", inset: 0, background: "rgba(31,35,40,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }}>
          <div className="sheet-enter" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "40rem", maxHeight: "90vh", overflowY: "auto", background: "#fff", borderRadius: "0.9rem", padding: "1.25rem", boxShadow: "0 12px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>מטריצת לקוחות וספקים</h2>
              <button onClick={() => setShowReport(false)} style={{ border: "none", background: "none", cursor: "pointer", color: "#80868B" }}><X size={20} /></button>
            </div>
            <div className="pill" onClick={() => setReportGroupByType((v) => !v)} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", color: ACCENT, border: `1px solid ${ACCENT}`, borderRadius: "0.4rem", padding: "0.3rem 0.7rem", marginBottom: "1rem" }}>
              <ArrowUpDown size={13} />{reportGroupByType ? "מוצג: מקובץ לפי סוג" : "מוצג: כללי לפי א-ב"}
            </div>
            {Object.entries(reportGrouped).map(([groupId, rows]) => {
              if (!rows.length) return null;
              const groupLabel = groupId ? partyTypeMeta(groupId).label : "כל הרשומות";
              const groupColor = groupId ? partyTypeMeta(groupId).color : SLATE;
              return (
                <div key={groupId || "all"} style={{ marginBottom: "1.25rem" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: groupColor, marginBottom: "0.5rem" }}>{groupLabel}</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                    <thead><tr style={{ borderBottom: "1px solid #E4E7EB", color: SLATE, textAlign: "right" }}><th style={{ padding: "0.4rem" }}>שם</th><th style={{ padding: "0.4rem" }}>הכנסות</th><th style={{ padding: "0.4rem" }}>הוצאות</th><th style={{ padding: "0.4rem" }}>תנועות</th></tr></thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} style={{ borderBottom: "1px solid #F5F6F7" }}>
                          <td style={{ padding: "0.4rem", fontWeight: 600 }}>{r.name}</td>
                          <td style={{ padding: "0.4rem", color: "#1E8E5A" }}>{r.income ? formatILS(r.income) : "—"}</td>
                          <td style={{ padding: "0.4rem", color: "#C5453D" }}>{r.expense ? formatILS(r.expense) : "—"}</td>
                          <td style={{ padding: "0.4rem", color: "#8A939C" }}>{r.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
            {!reportRows.length && <div style={{ textAlign: "center", color: "#9AA0A6", fontSize: "0.85rem", padding: "1.5rem 0" }}>אין עדיין נתונים להצגה.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function DayView({ date, periodEntries, reminders, categories, onEditEntry, onDeleteEntry, onEditReminder, onDeleteReminder, onContextMenuEntry, onContextMenuReminder }) {
  const dIso = iso(date);
  const dayReminders = reminders.filter((r) => r.date === dIso).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  return (
    <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.6rem", minHeight: "24rem" }}>
      {dayReminders.length === 0 && periodEntries.length === 0 && (
        <div style={{ textAlign: "center", color: "#9AA0A6", fontSize: "0.85rem", padding: "3rem 0" }}>אין תנועות או תזכורות ביום זה.</div>
      )}
      {dayReminders.map((r) => {
        const rs = reminderStatusMeta(r.status);
        return (
          <div key={r.id} onClick={() => onEditReminder(r)} onContextMenu={(ev) => onContextMenuReminder(ev, r)} style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: rs.color, borderRadius: "0.5rem", padding: "0.6rem 0.8rem", cursor: "pointer", color: "#fff" }}>
            <Bell size={15} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{r.title}</div>
              <div style={{ fontSize: "0.72rem", opacity: 0.9 }}>{r.time} · {rs.label}</div>
            </div>
            <button onClick={(ev) => { ev.stopPropagation(); onDeleteReminder(r.id); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#fff", opacity: 0.85 }}><Trash2 size={14} /></button>
          </div>
        );
      })}
      {periodEntries.map((e) => {
        const cat = categories.find((c) => c.id === e.category) || categories[categories.length - 1];
        return (
          <div key={e.id} onClick={() => onEditEntry(e)} onContextMenu={(ev) => onContextMenuEntry(ev, e)} style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: `${cat.color}18`, borderRight: `4px solid ${cat.color}`, borderRadius: "0.5rem", padding: "0.6rem 0.8rem", cursor: "pointer" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{e.partyName || cat.label}</div>
              <div style={{ fontSize: "0.72rem", color: "#8A939C" }}>{cat.label}{e.notes ? ` · ${e.notes}` : ""}</div>
            </div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: e.amount < 0 ? "#C5453D" : "#1E8E5A" }}>{formatILS(e.amount)}</div>
            <button onClick={(ev) => { ev.stopPropagation(); onDeleteEntry(e.id); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#9AA0A6" }}><Trash2 size={14} /></button>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ monthCursor, periodEntries, reminders, onPickDay }) {
  const gridStart = startOfWeek(startOfMonth(monthCursor));
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const dataByDay = {};
  for (const d of days) dataByDay[iso(d)] = { income: 0, expense: 0, count: 0, reminders: 0 };
  for (const e of periodEntries) {
    if (dataByDay[e.valueDate]) {
      if (e.amount > 0) dataByDay[e.valueDate].income += e.amount; else dataByDay[e.valueDate].expense += Math.abs(e.amount);
      dataByDay[e.valueDate].count++;
    }
  }
  for (const r of reminders) if (dataByDay[r.date]) dataByDay[r.date].reminders++;
  const todayStr = todayISO();
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
        {DAY_LABELS.map((l) => (<div key={l} style={{ textAlign: "center", fontSize: "0.7rem", color: "#8A939C", padding: "0.4rem 0", borderBottom: "1px solid #EEF0F2" }}>{l}</div>))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
        {days.map((d, i) => {
          const dIso = iso(d);
          const inMonth = d.getMonth() === monthCursor.getMonth();
          const isToday = dIso === todayStr;
          const info = dataByDay[dIso];
          return (
            <div key={dIso} className="month-cell" onClick={() => onPickDay(d)} style={{ minHeight: "5.2rem", border: "1px solid #EEF0F2", padding: "0.3rem", cursor: "pointer", background: isToday ? "#EAF0FC" : "#fff", opacity: inMonth ? 1 : 0.4 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: isToday ? 700 : 500, color: isToday ? ACCENT : "#3C4043" }}>{d.getDate()}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1px", marginTop: "0.2rem" }}>
                {info.income > 0 && <div style={{ fontSize: "0.6rem", color: "#1E8E5A" }}>{`+${formatILS(info.income)}`}</div>}
                {info.expense > 0 && <div style={{ fontSize: "0.6rem", color: "#C5453D" }}>{`-${formatILS(info.expense)}`}</div>}
                {info.reminders > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "0.58rem", color: "#8A6D1E" }}>
                    <Bell size={8} /> {info.reminders}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function YearView({ yearCursor, periodEntries, onPickMonth }) {
  const totals = Array.from({ length: 12 }, () => ({ income: 0, expense: 0 }));
  for (const e of periodEntries) {
    const d = new Date(e.valueDate + "T00:00:00");
    if (d.getFullYear() !== yearCursor) continue;
    if (e.amount > 0) totals[d.getMonth()].income += e.amount; else totals[d.getMonth()].expense += Math.abs(e.amount);
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", padding: "1rem" }}>
      {totals.map((t, m) => {
        const name = new Intl.DateTimeFormat("he-IL", { month: "long" }).format(new Date(yearCursor, m, 1));
        return (
          <div key={m} className="year-card" onClick={() => onPickMonth(new Date(yearCursor, m, 1))} style={{ border: "1px solid #EEF0F2", borderRadius: "0.6rem", padding: "0.85rem", cursor: "pointer", transition: "border-color 0.15s ease" }}>
            <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.5rem" }}>{name}</div>
            <div style={{ fontSize: "0.74rem", color: "#1E8E5A" }}>{`+${formatILS(t.income)}`}</div>
            <div style={{ fontSize: "0.74rem", color: "#C5453D" }}>{`-${formatILS(t.expense)}`}</div>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ data, size = 150, strokeWidth = 24 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  let offsetAccum = 0;
  const segments = data.filter((d) => d.value > 0).map((d, i) => {
    const fraction = d.value / total;
    const dash = fraction * circumference;
    const seg = { key: i, color: d.color, dash, gap: circumference - dash, offset: -offsetAccum };
    offsetAccum += dash;
    return seg;
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#EEF0F2" strokeWidth={strokeWidth} />
      {segments.map((s) => (
        <circle key={s.key} cx={cx} cy={cy} r={radius} fill="none" stroke={s.color} strokeWidth={strokeWidth} strokeDasharray={`${s.dash} ${s.gap}`} strokeDashoffset={s.offset} strokeLinecap="butt" />
      ))}
    </svg>
  );
}

function MiniCalendar({ monthCursor, onPick, weekStart }) {
  const first = startOfMonth(monthCursor);
  const startOffset = first.getDay();
  const daysInMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(monthCursor.getFullYear(), monthCursor.getMonth(), d));
  const todayStr = todayISO();
  const weekEnd = addDays(weekStart, 6);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: "0.2rem" }}>
        {DAY_LABELS.map((l) => <div key={l} style={{ textAlign: "center", fontSize: "0.6rem", color: "#9AA0A6", padding: "0.15rem 0" }}>{l}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px" }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const dStr = iso(d);
          const isToday = dStr === todayStr;
          const inWeek = d >= weekStart && d <= weekEnd;
          return (
            <div key={i} className="mini-cell" onClick={() => onPick(d)} style={{ textAlign: "center", fontSize: "0.68rem", padding: "0.28rem 0", borderRadius: "0.3rem", background: isToday ? ACCENT : inWeek ? "#EAF0FC" : "transparent", color: isToday ? "#fff" : inWeek ? ACCENT : INK, fontWeight: isToday ? 700 : 400 }}>
              {d.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={{ padding: "0.85rem 0.9rem 0.5rem", fontSize: "0.72rem", fontWeight: 700, color: SLATE }}>{children}</div>;
}
function MenuRow({ icon: Icon, label, onClick }) {
  return <div className="menu-btn" onClick={onClick} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.6rem 0.9rem", borderTop: "1px solid #EEF0F2", fontSize: "0.85rem" }}><Icon size={15} color={SLATE} />{label}</div>;
}
function FieldLabel({ children }) {
  return <div style={{ fontSize: "0.72rem", color: SLATE, margin: "0.55rem 0 0.25rem" }}>{children}</div>;
}
const inputStyle = { width: "100%", padding: "0.55rem 0.7rem", borderRadius: "0.45rem", border: "1px solid #DFE3E7", background: "#F8F9FA", fontSize: "0.85rem", outline: "none", color: INK, marginBottom: "0.7rem" };
const ctxMenuBtnStyle = { display: "flex", alignItems: "center", gap: "0.5rem", width: "100%", padding: "0.6rem 0.9rem", border: "none", background: "#fff", cursor: "pointer", fontSize: "0.85rem", textAlign: "right", color: INK };
