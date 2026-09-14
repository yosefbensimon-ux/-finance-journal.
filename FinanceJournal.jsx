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
function entryStatusColor(status) {
  if (status === "שולם") return "#1E8E5A";
  if (status === "בוטל") return "#C5453D";
  return "#C7920C";
}
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
    if (error) { setError(error.message); return false; }
    setEntries((prev) => [rowToEntry(data), ...prev]);
    setError("");
    return true;
  }
  async function updateEntry(id, formData) {
    const { data, error } = await supabase.from("entries").update(entryToRow(formData, userId)).eq("id", id).select().single();
    if (error) { setError(error.message); return false; }
    setEntries((prev) => prev.map((e) => (e.id === id ? rowToEntry(data) : e)));
    setError("");
    return true;
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
    const { data, error } = await supabase.from("reminders").insert(reminderTo
