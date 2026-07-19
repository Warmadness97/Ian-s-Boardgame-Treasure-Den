import { firebaseConfig, OWNER_EMAIL } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore, collection, doc, onSnapshot,
  addDoc, updateDoc, deleteDoc, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const gamesCol = collection(db, 'games');
const siteMetaRef = doc(db, 'meta', 'site');

let currentUser = null;
let isOwner = false;

const DICE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/><circle cx="16" cy="8" r="1.4" fill="currentColor"/><circle cx="8" cy="16" r="1.4" fill="currentColor"/><circle cx="16" cy="16" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>';
const HOURGLASS_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h12M6 22h12M6 2c0 5 5 6 6 8-1 2-6 3-6 8M18 2c0 5-5 6-6 8 1 2 6 3 6 8"/></svg>';
const EDIT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
const TRASH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';

let games = [];
let editingId = null;
let pendingImageData = null;
let titleSyncing = false;

const grid = document.getElementById('grid');
const emptyEl = document.getElementById('empty');
const loadingEl = document.getElementById('loading');
const countLabel = document.getElementById('count-label');
const overlay = document.getElementById('overlay');
const form = document.getElementById('game-form');
const imgInput = document.getElementById('img-input');
const imgPreview = document.getElementById('img-preview');
const imgHint = document.getElementById('img-hint');
const titleInput = document.getElementById('site-title');
const langFilterSelect = document.getElementById('filter-lang');
const typeFilterSelect = document.getElementById('filter-type');
const genreFilterSelect = document.getElementById('filter-genre');
const seriesFilterSelect = document.getElementById('filter-series');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const importBtn = document.getElementById('import-btn');
const importFileInput = document.getElementById('import-file-input');
const baseGameList = document.getElementById('base-game-list');
const baseGameField = document.getElementById('base-game-field');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userChip = document.getElementById('user-chip');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const downloadBtn = document.getElementById('download-btn');
const detailOverlay = document.getElementById('detail-overlay');
const detailClose = document.getElementById('detail-close');
const detailImg = document.getElementById('detail-img');
const detailName = document.getElementById('detail-name');
const detailTags = document.getElementById('detail-tags');
const detailBaseGame = document.getElementById('detail-basegame');
const detailStats = document.getElementById('detail-stats');
const detailDesc = document.getElementById('detail-desc');
const detailLink = document.getElementById('detail-link');

function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2400);
}
function escapeHtml(str){
  return (str||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ---------- Auth ---------- */
onAuthStateChanged(auth, (user)=>{
  currentUser = user;
  isOwner = !!(user && user.email === OWNER_EMAIL);
  document.body.classList.toggle('is-logged-in', !!user);
  document.body.classList.toggle('is-owner', isOwner);
  titleInput.readOnly = !isOwner;
  if(user){
    userAvatar.src = user.photoURL || '';
    userName.textContent = user.displayName || user.email || '已登入';
  }
  renderGrid();
});

loginBtn.addEventListener('click', async ()=>{
  try{
    await signInWithPopup(auth, googleProvider);
  }catch(err){
    console.error(err);
    showToast('登入失敗，請確認 Firebase 主控台已啟用 Google 登入方式');
  }
});
logoutBtn.addEventListener('click', ()=>{
  signOut(auth);
});

/* ---------- Real-time sync ---------- */
onSnapshot(siteMetaRef, (snap)=>{
  if(snap.exists() && !titleSyncing){
    const data = snap.data();
    if(data.title && document.activeElement !== titleInput){
      titleInput.value = data.title;
    }
  }
}, (err)=>{
  console.error(err);
  showToast('無法連線到共用資料庫，請確認 firebase-config.js 是否已正確填寫');
});

onSnapshot(gamesCol, (snap)=>{
  loadingEl.style.display = 'none';
  games = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a,b)=> (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
  updateLangFilterOptions();
  updateBaseGameOptions();
  updateGenreFilterOptions();
  updateSeriesFilterOptions();
  renderGrid();
}, (err)=>{
  console.error(err);
  loadingEl.textContent = '連線失敗，請確認 firebase-config.js 設定是否正確';
});

async function saveTitle(val){
  titleSyncing = true;
  try{
    await setDoc(siteMetaRef, { title: val }, { merge: true });
  }catch(e){
    showToast('標題儲存失敗，請確認網路連線與 Firebase 設定');
  }
  titleSyncing = false;
}

/* ---------- Rendering ---------- */
function updateLangFilterOptions(){
  const langs = new Set();
  games.forEach(g => (g.languages||[]).forEach(l => langs.add(l)));
  const current = langFilterSelect.value;
  langFilterSelect.innerHTML = '<option value="">不限語言版本</option>' +
    [...langs].sort().map(l => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join('');
  if([...langs].includes(current)) langFilterSelect.value = current;
}

function updateBaseGameOptions(){
  const baseNames = games.filter(g => g.gameType !== 'expansion').map(g => g.name);
  baseGameList.innerHTML = [...new Set(baseNames)].sort()
    .map(n => `<option value="${escapeHtml(n)}"></option>`).join('');
}

function updateGenreFilterOptions(){
  const genres = new Set();
  games.forEach(g => (g.genres||[]).forEach(t => genres.add(t)));
  const current = genreFilterSelect.value;
  genreFilterSelect.innerHTML = '<option value="">不限類型</option>' +
    [...genres].sort().map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
  if([...genres].includes(current)) genreFilterSelect.value = current;
}

function updateSeriesFilterOptions(){
  const seriesSet = new Set();
  games.forEach(g => { if(g.series) seriesSet.add(g.series); });
  const current = seriesFilterSelect.value;
  seriesFilterSelect.innerHTML = '<option value="">不限系列</option>' +
    [...seriesSet].sort().map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  if([...seriesSet].includes(current)) seriesFilterSelect.value = current;
}

function renderCard(g){
  const players = g.minPlayers === g.maxPlayers ? `${g.minPlayers} 人` : `${g.minPlayers}–${g.maxPlayers} 人`;
  const time = g.minTime === g.maxTime ? `${g.minTime} 分鐘` : `${g.minTime}–${g.maxTime} 分鐘`;
  const genreTags = (g.genres||[]).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join('');
  const langTags = (g.languages||[]).map(t=>`<span class="tag-lang">${escapeHtml(t)}</span>`).join('');
  const expansionTag = g.gameType === 'expansion' ? `<span class="tag-expansion">擴充</span>` : '';
  const seriesTag = g.series ? `<span class="tag-series">${escapeHtml(g.series)} 系列</span>` : '';
  const baseGameNote = (g.gameType === 'expansion' && g.baseGameName)
    ? `<div class="base-game-note">→ 擴充自「${escapeHtml(g.baseGameName)}」</div>` : '';
  const imgHtml = g.image
    ? `<img src="${g.image}" alt="${escapeHtml(g.name)}">`
    : `<div class="placeholder">尚未上傳圖片</div>`;
  return `
  <div class="card" data-id="${g.id}">
    <div class="card-img">${imgHtml}</div>
    <div class="card-body">
      <div class="card-name">${escapeHtml(g.name)}</div>
      <div class="tags">${expansionTag}${seriesTag}${genreTags}${langTags}</div>
      ${baseGameNote}
      <div class="card-desc">${escapeHtml(g.desc||'')}</div>
      <div class="stats-row">
        <div class="stat">${DICE_ICON}${players}</div>
        <div class="stat">${HOURGLASS_ICON}${time}</div>
      </div>
      ${isOwner ? `
      <div class="card-actions">
        <button class="edit-btn" data-action="edit" data-id="${g.id}">${EDIT_ICON} 編輯</button>
        <button class="del-btn" data-action="delete" data-id="${g.id}">${TRASH_ICON} 刪除</button>
      </div>` : ''}
    </div>
  </div>`;
}

function currentFilters(){
  return {
    q: document.getElementById('search-input').value.trim().toLowerCase(),
    minPlayerFilter: parseInt(document.getElementById('filter-players').value, 10),
    langFilter: langFilterSelect.value,
    typeFilter: typeFilterSelect.value,
    genreFilter: genreFilterSelect.value,
    seriesFilter: seriesFilterSelect.value
  };
}

function renderGrid(){
  const {q, minPlayerFilter, langFilter, typeFilter, genreFilter, seriesFilter} = currentFilters();
  let list = games;
  if(q){
    list = list.filter(g =>
      g.name.toLowerCase().includes(q) ||
      (g.genres||[]).some(t=>t.toLowerCase().includes(q)) ||
      (g.languages||[]).some(t=>t.toLowerCase().includes(q)) ||
      (g.series||'').toLowerCase().includes(q) ||
      (g.baseGameName||'').toLowerCase().includes(q)
    );
  }
  if(minPlayerFilter > 0){
    if(minPlayerFilter >= 6){
      list = list.filter(g => g.maxPlayers >= 6);
    } else {
      list = list.filter(g => g.minPlayers <= minPlayerFilter && g.maxPlayers >= minPlayerFilter);
    }
  }
  if(langFilter){
    list = list.filter(g => (g.languages||[]).includes(langFilter));
  }
  if(typeFilter){
    list = list.filter(g => (g.gameType||'base') === typeFilter);
  }
  if(genreFilter){
    list = list.filter(g => (g.genres||[]).includes(genreFilter));
  }
  if(seriesFilter){
    list = list.filter(g => g.series === seriesFilter);
  }
  countLabel.textContent = games.length;
  if(list.length === 0){
    grid.style.display = 'none';
    emptyEl.style.display = 'block';
    emptyEl.textContent = games.length === 0
      ? '尚未收錄任何桌遊 — 點選「新增桌遊」開始建立共用收藏'
      : '找不到符合條件的桌遊';
  } else {
    grid.style.display = 'grid';
    emptyEl.style.display = 'none';
    grid.innerHTML = list.map(renderCard).join('');
  }
}

/* ---------- Modal ---------- */
function openModal(mode, game){
  editingId = mode === 'edit' ? game.id : null;
  document.getElementById('modal-title').textContent = mode === 'edit' ? '編輯桌遊' : '新增桌遊';
  document.getElementById('f-name').value = game ? game.name : '';
  document.getElementById('f-genre').value = game ? (game.genres||[]).join(', ') : '';
  document.getElementById('f-lang').value = game ? (game.languages||[]).join(', ') : '';
  const gameType = game ? (game.gameType || 'base') : 'base';
  document.getElementById('f-type-base').checked = gameType === 'base';
  document.getElementById('f-type-expansion').checked = gameType === 'expansion';
  document.getElementById('f-basegame').value = game ? (game.baseGameName || '') : '';
  document.getElementById('f-series').value = game ? (game.series || '') : '';
  document.getElementById('f-url').value = game ? (game.url || '') : '';
  baseGameField.style.display = gameType === 'expansion' ? 'block' : 'none';
  document.getElementById('f-desc').value = game ? (game.desc||'') : '';
  document.getElementById('f-minp').value = game ? game.minPlayers : '';
  document.getElementById('f-maxp').value = game ? game.maxPlayers : '';
  document.getElementById('f-mint').value = game ? game.minTime : '';
  document.getElementById('f-maxt').value = game ? game.maxTime : '';
  pendingImageData = game ? (game.image || null) : null;
  if(pendingImageData){
    imgPreview.src = pendingImageData; imgPreview.style.display='block'; imgHint.textContent='點擊更換圖片';
  } else {
    imgPreview.style.display='none'; imgHint.textContent='點擊或拖曳圖片到此處上傳';
  }
  overlay.classList.add('show');
}
function closeModal(){
  overlay.classList.remove('show');
  form.reset();
  imgPreview.style.display='none';
  imgHint.textContent='點擊或拖曳圖片到此處上傳';
  pendingImageData = null;
  editingId = null;
  baseGameField.style.display = 'none';
}

document.getElementById('open-add-btn').addEventListener('click', ()=>{
  if(!isOwner){ showToast('只有管理者可以新增桌遊'); return; }
  openModal('add');
});
document.getElementById('cancel-btn').addEventListener('click', closeModal);
overlay.addEventListener('click', (e)=>{ if(e.target === overlay) closeModal(); });

document.querySelectorAll('input[name="f-type"]').forEach(radio=>{
  radio.addEventListener('change', ()=>{
    baseGameField.style.display = document.getElementById('f-type-expansion').checked ? 'block' : 'none';
  });
});

/* image resize + compress (Firestore 單一文件上限 1MB，圖片壓縮到安全範圍內) */
function handleImageFile(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e)=>{
    const img = new Image();
    img.onload = ()=>{
      const maxDim = 560;
      let w = img.width, h = img.height;
      if(w > h && w > maxDim){ h = Math.round(h*maxDim/w); w = maxDim; }
      else if(h > maxDim){ w = Math.round(w*maxDim/h); h = maxDim; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      pendingImageData = canvas.toDataURL('image/jpeg', 0.68);
      imgPreview.src = pendingImageData;
      imgPreview.style.display = 'block';
      imgHint.textContent = '點擊更換圖片';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
imgInput.addEventListener('change', (e)=> handleImageFile(e.target.files[0]));

/* form submit */
form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  if(!isOwner){ showToast('只有管理者可以儲存變更'); return; }
  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true; saveBtn.textContent = '儲存中…';

  const name = document.getElementById('f-name').value.trim();
  const genres = document.getElementById('f-genre').value.split(',').map(s=>s.trim()).filter(Boolean);
  const languages = document.getElementById('f-lang').value.split(',').map(s=>s.trim()).filter(Boolean);
  const gameType = document.getElementById('f-type-expansion').checked ? 'expansion' : 'base';
  const baseGameName = document.getElementById('f-basegame').value.trim();
  const series = document.getElementById('f-series').value.trim();
  const url = document.getElementById('f-url').value.trim();
  const desc = document.getElementById('f-desc').value.trim();
  const minPlayers = parseInt(document.getElementById('f-minp').value,10);
  const maxPlayers = parseInt(document.getElementById('f-maxp').value,10);
  const minTime = parseInt(document.getElementById('f-mint').value,10);
  const maxTime = parseInt(document.getElementById('f-maxt').value,10);

  if(!name || isNaN(minPlayers) || isNaN(maxPlayers) || isNaN(minTime) || isNaN(maxTime)){
    showToast('請完整填寫必填欄位'); saveBtn.disabled=false; saveBtn.textContent='儲存'; return;
  }
  if(minPlayers > maxPlayers || minTime > maxTime){
    showToast('最少值不可大於最多值'); saveBtn.disabled=false; saveBtn.textContent='儲存'; return;
  }

  const payload = {
    name, genres, languages, desc, minPlayers, maxPlayers, minTime, maxTime,
    gameType, baseGameName: gameType === 'expansion' ? baseGameName : '', series, url,
    image: pendingImageData || null
  };

  try{
    if(editingId){
      await updateDoc(doc(db, 'games', editingId), payload);
      showToast('已更新桌遊');
    } else {
      payload.createdAt = serverTimestamp();
      await addDoc(gamesCol, payload);
      showToast('已新增桌遊');
    }
    closeModal();
  }catch(err){
    console.error(err);
    showToast('儲存失敗，圖片可能過大或網路連線不穩，請再試一次');
  }
  saveBtn.disabled=false; saveBtn.textContent='儲存';
});

function openDetailModal(g){
  const players = g.minPlayers === g.maxPlayers ? `${g.minPlayers} 人` : `${g.minPlayers}–${g.maxPlayers} 人`;
  const time = g.minTime === g.maxTime ? `${g.minTime} 分鐘` : `${g.minTime}–${g.maxTime} 分鐘`;
  const genreTags = (g.genres||[]).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join('');
  const langTags = (g.languages||[]).map(t=>`<span class="tag-lang">${escapeHtml(t)}</span>`).join('');
  const expansionTag = g.gameType === 'expansion' ? `<span class="tag-expansion">擴充</span>` : '';
  const seriesTag = g.series ? `<span class="tag-series">${escapeHtml(g.series)} 系列</span>` : '';

  detailImg.innerHTML = g.image
    ? `<img src="${g.image}" alt="${escapeHtml(g.name)}">`
    : `<div class="placeholder">尚未上傳圖片</div>`;
  detailName.textContent = g.name;
  detailTags.innerHTML = expansionTag + seriesTag + genreTags + langTags;
  detailBaseGame.textContent = (g.gameType === 'expansion' && g.baseGameName) ? `→ 擴充自「${g.baseGameName}」` : '';
  detailStats.innerHTML = `<div class="stat">${DICE_ICON}${players}</div><div class="stat">${HOURGLASS_ICON}${time}</div>`;
  detailDesc.textContent = g.desc || '（尚未填寫簡介）';
  if(g.url){
    detailLink.href = g.url;
    detailLink.style.display = 'inline-block';
  } else {
    detailLink.style.display = 'none';
  }
  detailOverlay.classList.add('show');
}
function closeDetailModal(){
  detailOverlay.classList.remove('show');
}
detailClose.addEventListener('click', closeDetailModal);
detailOverlay.addEventListener('click', (e)=>{ if(e.target === detailOverlay) closeDetailModal(); });

/* grid actions: click card to view details, edit / delete for owner */
grid.addEventListener('click', async (e)=>{
  const btn = e.target.closest('button[data-action]');
  const card = e.target.closest('.card');
  if(!card) return;
  const id = card.dataset.id;
  const g = games.find(x=>x.id===id);
  if(!g) return;

  if(!btn){
    openDetailModal(g);
    return;
  }

  const action = btn.dataset.action;
  if(!isOwner){ showToast('只有管理者可以編輯或刪除'); return; }
  if(action === 'edit'){
    openModal('edit', g);
  } else if(action === 'delete'){
    if(confirm(`確定要刪除「${g.name}」嗎？此動作無法復原，且會影響所有共用此頁面的人。`)){
      try{
        await deleteDoc(doc(db, 'games', id));
        showToast('已刪除桌遊');
      }catch(err){
        showToast('刪除失敗，請稍後再試');
      }
    }
  }
});

/* search + filter */
document.getElementById('search-input').addEventListener('input', renderGrid);
document.getElementById('filter-players').addEventListener('change', renderGrid);
langFilterSelect.addEventListener('change', renderGrid);
typeFilterSelect.addEventListener('change', renderGrid);
genreFilterSelect.addEventListener('change', renderGrid);
seriesFilterSelect.addEventListener('change', renderGrid);
resetFiltersBtn.addEventListener('click', ()=>{
  document.getElementById('search-input').value = '';
  document.getElementById('filter-players').value = '0';
  langFilterSelect.value = '';
  typeFilterSelect.value = '';
  genreFilterSelect.value = '';
  seriesFilterSelect.value = '';
  renderGrid();
});

/* title editing */
titleInput.addEventListener('blur', ()=>{
  if(!isOwner) return;
  const val = titleInput.value.trim() || '桌遊資料庫';
  titleInput.value = val;
  saveTitle(val);
});
titleInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); titleInput.blur(); } });
document.getElementById('title-pencil').addEventListener('click', ()=>{
  if(!isOwner){ showToast('只有管理者可以修改標題'); return; }
  titleInput.focus();
});

/* ---------- Download list as CSV ---------- */
function csvEscape(val){
  const s = (val===undefined || val===null) ? '' : String(val);
  if(/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
  return s;
}
downloadBtn.addEventListener('click', ()=>{
  if(games.length === 0){ showToast('目前還沒有任何桌遊可以下載'); return; }
  const headers = ['名稱','類型','所屬主遊戲','系列','桌遊類型(逗號分隔)','語言版本(逗號分隔)','最少人數','最多人數','最少時間(分鐘)','最多時間(分鐘)','網址連結','簡介'];
  const rows = games.map(g => [
    g.name,
    g.gameType === 'expansion' ? '擴充' : '主遊戲',
    g.gameType === 'expansion' ? (g.baseGameName||'') : '',
    g.series || '',
    (g.genres||[]).join('、'),
    (g.languages||[]).join('、'),
    g.minPlayers, g.maxPlayers, g.minTime, g.maxTime,
    g.url || '',
    g.desc || ''
  ]);
  const csv = [headers, ...rows].map(row => row.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const siteName = (titleInput.value || '桌遊資料庫').trim();
  a.href = url;
  a.download = `${siteName}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('已下載清單');
});

/* ---------- Import list from CSV ---------- */
function parseCSV(text){
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for(let i=0; i<text.length; i++){
    const c = text[i];
    if(inQuotes){
      if(c === '"'){
        if(text[i+1] === '"'){ field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
    } else {
      if(c === '"'){ inQuotes = true; }
      else if(c === ','){ row.push(field); field = ''; }
      else if(c === '\n' || c === '\r'){
        if(c === '\r' && text[i+1] === '\n') i++;
        row.push(field); field = '';
        rows.push(row); row = [];
      } else {
        field += c;
      }
    }
  }
  if(field.length > 0 || row.length > 0){ row.push(field); rows.push(row); }
  return rows.filter(r => r.some(cell => cell.trim() !== ''));
}

importBtn.addEventListener('click', ()=>{
  if(!isOwner){ showToast('只有管理者可以匯入清單'); return; }
  importFileInput.value = '';
  importFileInput.click();
});

importFileInput.addEventListener('change', async (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  if(!isOwner){ showToast('只有管理者可以匯入清單'); return; }

  const text = await file.text();
  const rows = parseCSV(text);
  if(rows.length < 2){ showToast('檔案內容是空的，或格式不正確'); return; }

  // 依下載清單的欄位順序解析：
  // 名稱,類型,所屬主遊戲,系列,桌遊類型,語言版本,最少人數,最多人數,最少時間,最多時間,網址連結,簡介
  const dataRows = rows.slice(1);
  let successCount = 0, skipCount = 0;
  importBtn.disabled = true;
  const originalLabel = importBtn.innerHTML;
  importBtn.innerHTML = '匯入中…';

  for(const r of dataRows){
    const [name, typeLabel, baseGameName, series, genreStr, langStr, minP, maxP, minT, maxT, url, desc] = r;
    const trimmedName = (name||'').trim();
    const minPlayers = parseInt(minP, 10), maxPlayers = parseInt(maxP, 10);
    const minTime = parseInt(minT, 10), maxTime = parseInt(maxT, 10);
    if(!trimmedName || isNaN(minPlayers) || isNaN(maxPlayers) || isNaN(minTime) || isNaN(maxTime)){
      skipCount++; continue;
    }
    const gameType = (typeLabel||'').trim() === '擴充' ? 'expansion' : 'base';
    const genres = (genreStr||'').split(/[、,]/).map(s=>s.trim()).filter(Boolean);
    const languages = (langStr||'').split(/[、,]/).map(s=>s.trim()).filter(Boolean);
    const payload = {
      name: trimmedName, genres, languages, desc: (desc||'').trim(),
      minPlayers, maxPlayers, minTime, maxTime,
      gameType, baseGameName: gameType === 'expansion' ? (baseGameName||'').trim() : '',
      series: (series||'').trim(), url: (url||'').trim(),
      image: null, createdAt: serverTimestamp()
    };
    try{
      await addDoc(gamesCol, payload);
      successCount++;
    }catch(err){
      console.error(err);
      skipCount++;
    }
  }

  importBtn.disabled = false;
  importBtn.innerHTML = originalLabel;
  showToast(`匯入完成：成功 ${successCount} 筆，略過 ${skipCount} 筆`);
});
