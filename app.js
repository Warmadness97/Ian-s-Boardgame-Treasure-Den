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
const photosCol = collection(db, 'photos');
const siteMetaRef = doc(db, 'meta', 'site');

let currentUser = null;
let isOwner = false;

const DICE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/><circle cx="16" cy="8" r="1.4" fill="currentColor"/><circle cx="8" cy="16" r="1.4" fill="currentColor"/><circle cx="16" cy="16" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>';
const HOURGLASS_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h12M6 22h12M6 2c0 5 5 6 6 8-1 2-6 3-6 8M18 2c0 5-5 6-6 8 1 2 6 3 6 8"/></svg>';
const CALENDAR_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
const EDIT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
const TRASH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';

let games = [];
let photos = [];
let pendingPhotoImageData = null;
let editingPhotoId = null;
let editingId = null;
let pendingImageData = null;
let pendingImageFullData = null;
let titleSyncing = false;
let currentPage = 1;
let pageSize = 20;
let genreNotes = {};
let seriesNotes = {};
let featuredGameId = null;
let seriesCovers = {};
let facetOrder = ['players','lang','genre','series','year','difficulty','type'];
let facetOrderDraft = [];
const selectedImageIds = new Set();

const grid = document.getElementById('grid');
const emptyEl = document.getElementById('empty');
const loadingEl = document.getElementById('loading');
const countLabel = document.getElementById('count-label');
const overlay = document.getElementById('overlay');
const form = document.getElementById('game-form');
const imgInput = document.getElementById('img-input');
const imgPreview = document.getElementById('img-preview');
const imgHint = document.getElementById('img-hint');
const imgRemoveBtn = document.getElementById('img-remove-btn');
const imgResizeBtn = document.getElementById('img-resize-btn');
const titleInput = document.getElementById('site-title');
const filterPlayersGroup = document.getElementById('filter-players-group');
const filterLangGroup = document.getElementById('filter-lang-group');
const filterGenreGroup = document.getElementById('filter-genre-group');
const filterSeriesGroup = document.getElementById('filter-series-group');
const filterYearGroup = document.getElementById('filter-year-group');
const filterDifficultyGroup = document.getElementById('filter-difficulty-group');
const filterTypeGroup = document.getElementById('filter-type-group');
const resultsCountEl = document.getElementById('results-count');
const homeView = document.getElementById('home-view');
const libraryView = document.getElementById('library-view');
const enterLibraryBtn = document.getElementById('enter-library-btn');
const backHomeBtn = document.getElementById('back-home-btn');
const galleryView = document.getElementById('gallery-view');
const enterGalleryBtn = document.getElementById('enter-gallery-btn');
const galleryBackHomeBtn = document.getElementById('gallery-back-home-btn');
const galleryAddBtn = document.getElementById('gallery-add-btn');
const galleryGrid = document.getElementById('gallery-grid');
const galleryEmpty = document.getElementById('gallery-empty');
const galleryLoading = document.getElementById('gallery-loading');
const galleryCount = document.getElementById('gallery-count');
const gallerySortSelect = document.getElementById('gallery-sort-select');
const photoOverlay = document.getElementById('photo-overlay');
const photoModalTitle = document.getElementById('photo-modal-title');
const photoForm = document.getElementById('photo-form');
const photoImgInput = document.getElementById('photo-img-input');
const photoImgPreview = document.getElementById('photo-img-preview');
const photoImgHint = document.getElementById('photo-img-hint');
const photoCaption = document.getElementById('photo-caption');
const photoCancelBtn = document.getElementById('photo-cancel-btn');
const photoSaveBtn = document.getElementById('photo-save-btn');
const photoDetailOverlay = document.getElementById('photo-detail-overlay');
const photoDetailClose = document.getElementById('photo-detail-close');
const photoDetailImg = document.getElementById('photo-detail-img');
const photoDetailCaption = document.getElementById('photo-detail-caption');
const photoDetailDate = document.getElementById('photo-detail-date');
const recommendContent = document.getElementById('recommend-content');
const recommendPencil = document.getElementById('recommend-pencil');
const genreLegendList = document.getElementById('genre-legend-list');
const dailyPickSection = document.getElementById('daily-pick-section');
const pageSizeSelect = document.getElementById('page-size-select');
const paginationEl = document.getElementById('pagination');
const imageManagerBtn = document.getElementById('image-manager-btn');
const imageManagerOverlay = document.getElementById('image-manager-overlay');
const imageManagerClose = document.getElementById('image-manager-close');
const imageManagerList = document.getElementById('image-manager-list');
const imageManagerSelectAll = document.getElementById('image-manager-select-all');
const imageManagerDownloadSelectedBtn = document.getElementById('image-manager-download-selected');
const imageManagerRemoveSelectedBtn = document.getElementById('image-manager-remove-selected');
const seriesLegendList = document.getElementById('series-legend-list');
const dailyPickManagerOverlay = document.getElementById('daily-pick-manager-overlay');
const dailyPickManagerClose = document.getElementById('daily-pick-manager-close');
const dailyPickManagerCloseBtn = document.getElementById('daily-pick-manager-close-btn');
const dailyPickSelect = document.getElementById('daily-pick-select');
const dailyPickApplyBtn = document.getElementById('daily-pick-apply-btn');
const seriesCoverOverlay = document.getElementById('series-cover-overlay');
const seriesCoverClose = document.getElementById('series-cover-close');
const seriesCoverList = document.getElementById('series-cover-list');
const seriesCoverTitle = document.getElementById('series-cover-title');
const facetOrderBtn = document.getElementById('facet-order-btn');
const facetOrderOverlay = document.getElementById('facet-order-overlay');
const facetOrderClose = document.getElementById('facet-order-close');
const facetOrderCancel = document.getElementById('facet-order-cancel');
const facetOrderApply = document.getElementById('facet-order-apply');
const facetOrderList = document.getElementById('facet-order-list');

const selectedPlayers = new Set();
const selectedLangs = new Set();
const selectedGenres = new Set();
const selectedSeries = new Set();
const selectedYears = new Set();
const selectedDifficulties = new Set();
const selectedTypes = new Set();
const sortSelect = document.getElementById('sort-select');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const importBtn = document.getElementById('import-btn');
const importFileInput = document.getElementById('import-file-input');
const baseGameList = document.getElementById('base-game-list');
const baseGameField = document.getElementById('base-game-field');
const standaloneCheckbox = document.getElementById('f-standalone');
const difficultyInputEl = document.getElementById('f-difficulty');
const difficultyStarBtns = document.querySelectorAll('#difficulty-input .star-btn');
const difficultyClearBtn = document.getElementById('difficulty-clear');
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
const detailMeta = document.getElementById('detail-meta');
const detailStats = document.getElementById('detail-stats');
const detailDesc = document.getElementById('detail-desc');
const detailLink = document.getElementById('detail-link');
const detailNameEn = document.getElementById('detail-name-en');
const detailDifficulty = document.getElementById('detail-difficulty');
const bannerEl = document.getElementById('banner');
const bannerImg = document.getElementById('banner-img');
const bannerUploadBtn = document.getElementById('banner-upload-btn');
const bannerRemoveBtn = document.getElementById('banner-remove-btn');
const bannerFileInput = document.getElementById('banner-file-input');
const customSubtitleInput = document.getElementById('custom-subtitle');
const subtitlePencil = document.getElementById('subtitle-pencil');
const filterMasterBtn = document.getElementById('filter-master-btn');
const filterMasterPanel = document.getElementById('filter-master-panel');
const filterMasterGrid = document.getElementById('filter-master-grid');
const masterFilterBadge = document.getElementById('master-filter-badge');
const badgePlayers = document.getElementById('badge-players');
const badgeLang = document.getElementById('badge-lang');
const badgeGenre = document.getElementById('badge-genre');
const badgeSeries = document.getElementById('badge-series');
const badgeYear = document.getElementById('badge-year');
const badgeDifficulty = document.getElementById('badge-difficulty');
const badgeType = document.getElementById('badge-type');
const listToggleBtn = document.getElementById('list-toggle-btn');
const listPanel = document.getElementById('list-panel');

function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2400);
}
function escapeHtml(str){
  return (str||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderStars(n){
  if(!n) return '';
  let out = '';
  for(let i=1;i<=5;i++){
    out += `<span class="${i<=n ? 'filled':'empty'}">★</span>`;
  }
  return out;
}

function isNewGame(g){
  const sec = g.createdAt && g.createdAt.seconds;
  if(!sec) return false;
  return (Date.now() - sec*1000) < 24*60*60*1000;
}

function applySort(list, mode){
  const sorted = [...list];
  if(mode === 'name'){
    sorted.sort((a,b)=> (a.name||'').localeCompare(b.name||'', undefined, {sensitivity:'base'}));
  } else if(mode === 'year-desc'){
    sorted.sort((a,b)=>{
      if(!a.year) return 1;
      if(!b.year) return -1;
      return b.year - a.year;
    });
  } else if(mode === 'year-asc'){
    sorted.sort((a,b)=>{
      if(!a.year) return 1;
      if(!b.year) return -1;
      return a.year - b.year;
    });
  } else if(mode === 'lang'){
    sorted.sort((a,b)=>{
      const al = (a.languages && a.languages[0]) || '';
      const bl = (b.languages && b.languages[0]) || '';
      if(!al) return 1;
      if(!bl) return -1;
      return al.localeCompare(bl, undefined, {sensitivity:'base'});
    });
  } else {
    sorted.sort((a,b)=> ((b.createdAt&&b.createdAt.seconds)||0) - ((a.createdAt&&a.createdAt.seconds)||0));
  }
  return sorted;
}

function setDifficultyInputValue(val){
  difficultyInputEl.value = val;
  difficultyStarBtns.forEach(btn=>{
    btn.classList.toggle('filled', parseInt(btn.dataset.value,10) <= val);
  });
}
difficultyStarBtns.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    setDifficultyInputValue(parseInt(btn.dataset.value,10));
  });
});
difficultyClearBtn.addEventListener('click', ()=> setDifficultyInputValue(0));

/* ---------- Auth ---------- */
onAuthStateChanged(auth, (user)=>{
  currentUser = user;
  isOwner = !!(user && user.email === OWNER_EMAIL);
  document.body.classList.toggle('is-logged-in', !!user);
  document.body.classList.toggle('is-owner', isOwner);
  titleInput.readOnly = !isOwner;
  customSubtitleInput.readOnly = !isOwner;
  refreshSubtitleVisibility();
  refreshRecommendVisibility();
  renderGenreLegend();
  renderSeriesLegend();
  bannerRemoveBtn.style.display = (isOwner && bannerEl.classList.contains('has-image')) ? 'flex' : 'none';
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
    const code = err && err.code ? err.code : '未知錯誤';
    if(code === 'auth/unauthorized-domain'){
      showToast('登入失敗（auth/unauthorized-domain）：此網域尚未加入 Firebase 已授權網域清單');
    } else if(code === 'auth/operation-not-allowed'){
      showToast('登入失敗（auth/operation-not-allowed）：Firebase 尚未啟用 Google 登入方式');
    } else if(code === 'auth/popup-blocked'){
      showToast('登入視窗被瀏覽器擋下，請允許彈出視窗後再試一次');
    } else if(code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request'){
      // 使用者自己關掉登入視窗，不需要顯示錯誤
    } else {
      showToast(`登入失敗（${code}）：請確認 Firebase 設定`);
    }
  }
});
logoutBtn.addEventListener('click', ()=>{
  signOut(auth);
});

/* ---------- Real-time sync ---------- */
function refreshSubtitleVisibility(){
  const box = customSubtitleInput.closest('.custom-subtitle-box');
  box.style.display = (customSubtitleInput.value.trim() || isOwner) ? 'flex' : 'none';
}

function refreshRecommendVisibility(){
  const section = recommendContent.closest('.recommend-section');
  section.style.display = (recommendContent.value.trim() || isOwner) ? 'block' : 'none';
}

function autoGrowTextarea(el){
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

onSnapshot(siteMetaRef, (snap)=>{
  if(snap.exists() && !titleSyncing){
    const data = snap.data();
    if(data.title && document.activeElement !== titleInput){
      titleInput.value = data.title;
    }
    if(document.activeElement !== customSubtitleInput){
      customSubtitleInput.value = data.subtitle || '';
      autoGrowTextarea(customSubtitleInput);
    }
    if(document.activeElement !== recommendContent){
      recommendContent.value = data.recommendation || '';
      autoGrowTextarea(recommendContent);
    }
    genreNotes = data.genreNotes || {};
    seriesNotes = data.seriesNotes || {};
    seriesCovers = data.seriesCovers || {};
    featuredGameId = data.featuredGameId || null;
    const FACET_KEYS = ['players','lang','genre','series','year','difficulty','type'];
    if(Array.isArray(data.facetOrder) && FACET_KEYS.every(k => data.facetOrder.includes(k)) && data.facetOrder.length === FACET_KEYS.length){
      facetOrder = data.facetOrder;
    }
    applyFacetOrder();
    renderGenreLegend();
    renderSeriesLegend();
    renderDailyPick();
    renderGrid();
    if(data.headerImage){
      bannerImg.src = data.headerImage;
      bannerImg.style.display = 'block';
      bannerEl.classList.add('has-image');
      bannerRemoveBtn.style.display = isOwner ? 'flex' : 'none';
    } else {
      bannerImg.style.display = 'none';
      bannerEl.classList.remove('has-image');
      bannerRemoveBtn.style.display = 'none';
    }
    refreshSubtitleVisibility();
    refreshRecommendVisibility();
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
  updateYearFilterOptions();
  renderGenreLegend();
  renderSeriesLegend();
  renderDailyPick();
  renderGrid();
}, (err)=>{
  console.error(err);
  loadingEl.textContent = '連線失敗，請確認 firebase-config.js 設定是否正確';
});

onSnapshot(photosCol, (snap)=>{
  galleryLoading.style.display = 'none';
  photos = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a,b)=> (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
  renderPhotoGrid();
}, (err)=>{
  console.error(err);
  galleryLoading.textContent = '連線失敗，請確認 firebase-config.js 設定是否正確，或是否已建立 photos 集合的安全規則';
});

function formatPhotoDate(createdAt){
  if(!createdAt || !createdAt.seconds) return '';
  const d = new Date(createdAt.seconds * 1000);
  return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
}

function renderPhotoGrid(){
  galleryCount.style.display = photos.length > 0 ? 'block' : 'none';
  galleryCount.innerHTML = `共 <strong>${photos.length}</strong> 張照片`;
  if(photos.length === 0){
    galleryGrid.style.display = 'none';
    galleryEmpty.style.display = 'block';
    return;
  }
  galleryGrid.style.display = 'grid';
  galleryEmpty.style.display = 'none';
  const sortMode = gallerySortSelect.value;
  const sorted = [...photos].sort((a,b)=>{
    const at = (a.createdAt && a.createdAt.seconds) || 0;
    const bt = (b.createdAt && b.createdAt.seconds) || 0;
    return sortMode === 'oldest' ? at - bt : bt - at;
  });
  galleryGrid.innerHTML = sorted.map(p => `
    <div class="photo-card" data-id="${p.id}">
      <img src="${p.image}" alt="${escapeHtml(p.caption||'')}">
      <div class="photo-card-overlay">
        ${p.caption ? `<div class="photo-card-caption-hint">${escapeHtml(p.caption)}</div>` : ''}
        <div class="photo-card-date">${formatPhotoDate(p.createdAt)}</div>
      </div>
      ${isOwner ? `
      <div class="photo-card-actions">
        <button type="button" class="photo-edit-btn" data-id="${p.id}" title="編輯照片">${EDIT_ICON}</button>
        <button type="button" class="photo-delete-btn" data-id="${p.id}" title="刪除照片">✕</button>
      </div>` : ''}
    </div>`).join('');
}

gallerySortSelect.addEventListener('change', renderPhotoGrid);

galleryGrid.addEventListener('click', (e)=>{
  const editBtn = e.target.closest('.photo-edit-btn');
  if(editBtn){
    e.stopPropagation();
    if(!isOwner) return;
    const p = photos.find(x => x.id === editBtn.dataset.id);
    if(p) openPhotoModal('edit', p);
    return;
  }
  const delBtn = e.target.closest('.photo-delete-btn');
  if(delBtn){
    e.stopPropagation();
    if(!isOwner) return;
    const id = delBtn.dataset.id;
    if(!confirm('確定要刪除這張照片嗎？此動作無法復原。')) return;
    deleteDoc(doc(db, 'photos', id))
      .then(()=> showToast('已刪除照片'))
      .catch(()=> showToast('刪除失敗，請稍後再試'));
    return;
  }
  const card = e.target.closest('.photo-card');
  if(card){
    const p = photos.find(x => x.id === card.dataset.id);
    if(!p) return;
    photoDetailImg.innerHTML = `<img src="${p.image}" alt="">`;
    photoDetailCaption.textContent = p.caption || '（沒有照片說明）';
    photoDetailDate.textContent = formatPhotoDate(p.createdAt) ? `上傳於 ${formatPhotoDate(p.createdAt)}` : '';
    photoDetailOverlay.classList.add('show');
  }
});
photoDetailClose.addEventListener('click', ()=> photoDetailOverlay.classList.remove('show'));
photoDetailOverlay.addEventListener('click', (e)=>{ if(e.target === photoDetailOverlay) photoDetailOverlay.classList.remove('show'); });

/* photo upload / edit */
function openPhotoModal(mode, photo){
  editingPhotoId = mode === 'edit' ? photo.id : null;
  photoModalTitle.textContent = mode === 'edit' ? '編輯照片' : '上傳活動照片';
  photoSaveBtn.textContent = mode === 'edit' ? '儲存' : '上傳';
  photoCaption.value = photo ? (photo.caption || '') : '';
  pendingPhotoImageData = photo ? (photo.image || null) : null;
  if(pendingPhotoImageData){
    photoImgPreview.src = pendingPhotoImageData;
    photoImgPreview.style.display = 'block';
    photoImgHint.textContent = '點擊更換圖片';
  } else {
    photoImgPreview.style.display = 'none';
    photoImgHint.textContent = '點擊或拖曳圖片到此處上傳';
  }
  photoOverlay.classList.add('show');
}
function closePhotoModal(){
  photoOverlay.classList.remove('show');
  photoForm.reset();
  photoImgPreview.style.display = 'none';
  photoImgHint.textContent = '點擊或拖曳圖片到此處上傳';
  pendingPhotoImageData = null;
  editingPhotoId = null;
}
galleryAddBtn.addEventListener('click', ()=>{
  if(!isOwner){ showToast('只有管理者可以上傳照片'); return; }
  openPhotoModal('add');
});
photoCancelBtn.addEventListener('click', closePhotoModal);
photoOverlay.addEventListener('click', (e)=>{ if(e.target === photoOverlay) closePhotoModal(); });

async function handlePhotoImageFile(file){
  if(!file) return;
  pendingPhotoImageData = await compressImage(file, 900, 0.78);
  photoImgPreview.src = pendingPhotoImageData;
  photoImgPreview.style.display = 'block';
  photoImgHint.textContent = '點擊更換圖片';
}
photoImgInput.addEventListener('change', (e)=> handlePhotoImageFile(e.target.files[0]));

photoForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  if(!isOwner){ showToast('只有管理者可以上傳照片'); return; }
  if(!pendingPhotoImageData){ showToast('請先選擇一張照片'); return; }
  photoSaveBtn.disabled = true;
  const savingLabel = editingPhotoId ? '儲存中…' : '上傳中…';
  photoSaveBtn.textContent = savingLabel;
  try{
    if(editingPhotoId){
      await updateDoc(doc(db, 'photos', editingPhotoId), {
        image: pendingPhotoImageData,
        caption: photoCaption.value.trim()
      });
      showToast('已更新照片');
    } else {
      await addDoc(photosCol, {
        image: pendingPhotoImageData,
        caption: photoCaption.value.trim(),
        createdAt: serverTimestamp()
      });
      showToast('已上傳照片');
    }
    closePhotoModal();
  }catch(err){
    console.error(err);
    showToast('儲存失敗，請確認網路連線與 Firebase 設定');
  }
  photoSaveBtn.disabled = false;
  photoSaveBtn.textContent = editingPhotoId ? '儲存' : '上傳';
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

async function saveSubtitle(val){
  try{
    await setDoc(siteMetaRef, { subtitle: val }, { merge: true });
  }catch(e){
    showToast('副標儲存失敗，請確認網路連線與 Firebase 設定');
  }
}

async function saveRecommendation(val){
  try{
    await setDoc(siteMetaRef, { recommendation: val }, { merge: true });
  }catch(e){
    showToast('推薦內容儲存失敗，請確認網路連線與 Firebase 設定');
  }
}

async function saveGenreNotes(){
  try{
    await setDoc(siteMetaRef, { genreNotes }, { merge: true });
  }catch(e){
    showToast('類型說明儲存失敗，請確認網路連線與 Firebase 設定');
  }
}

async function saveSeriesNotes(){
  try{
    await setDoc(siteMetaRef, { seriesNotes }, { merge: true });
  }catch(e){
    showToast('系列說明儲存失敗，請確認網路連線與 Firebase 設定');
  }
}

async function saveFeaturedGameId(id){
  try{
    await setDoc(siteMetaRef, { featuredGameId: id }, { merge: true });
  }catch(e){
    showToast('今日推薦設定失敗，請確認網路連線與 Firebase 設定');
  }
}

async function saveSeriesCovers(){
  try{
    await setDoc(siteMetaRef, { seriesCovers }, { merge: true });
  }catch(e){
    showToast('系列封面設定失敗，請確認網路連線與 Firebase 設定');
  }
}

async function saveBannerImage(dataUrlOrNull){
  try{
    await setDoc(siteMetaRef, { headerImage: dataUrlOrNull }, { merge: true });
  }catch(e){
    showToast('橫幅圖片儲存失敗，圖片可能過大或網路連線不穩');
  }
}

/* ---------- Rendering ---------- */
function renderCheckboxGroup(container, values, selectedSet, emptyLabel){
  if(values.length === 0){
    container.innerHTML = `<span class="checkbox-empty">${emptyLabel}</span>`;
    return;
  }
  container.innerHTML = values.map(v=>{
    const strVal = String(v);
    const checked = selectedSet.has(strVal) ? 'checked' : '';
    return `<label class="checkbox-option"><input type="checkbox" value="${escapeHtml(strVal)}" ${checked}> ${escapeHtml(strVal)}</label>`;
  }).join('');
}

function updateLangFilterOptions(){
  const langs = new Set();
  games.forEach(g => (g.languages||[]).forEach(l => langs.add(l)));
  renderCheckboxGroup(filterLangGroup, [...langs].sort(), selectedLangs, '尚無語言版本資料');
}

function updateBaseGameOptions(){
  const baseNames = games.filter(g => g.gameType !== 'expansion').map(g => g.name);
  baseGameList.innerHTML = [...new Set(baseNames)].sort()
    .map(n => `<option value="${escapeHtml(n)}"></option>`).join('');
}

function updateGenreFilterOptions(){
  const genres = new Set();
  games.forEach(g => (g.genres||[]).forEach(t => genres.add(t)));
  renderCheckboxGroup(filterGenreGroup, [...genres].sort(), selectedGenres, '尚無類型資料');
}

function updateSeriesFilterOptions(){
  const seriesSet = new Set();
  games.forEach(g => { if(g.series) seriesSet.add(g.series); });
  renderCheckboxGroup(filterSeriesGroup, [...seriesSet].sort(), selectedSeries, '尚無系列資料');
}

function updateYearFilterOptions(){
  const years = new Set();
  games.forEach(g => { if(g.year) years.add(g.year); });
  renderCheckboxGroup(filterYearGroup, [...years].sort((a,b)=>b-a), selectedYears, '尚無年份資料');
}

const LEGEND_PREVIEW_LIMIT = 6;
let genreLegendExpanded = false;
let seriesLegendExpanded = false;

function buildLegendListHtml(itemsHtml, expanded, toggleId){
  const total = itemsHtml.length;
  if(total <= LEGEND_PREVIEW_LIMIT){
    return itemsHtml.join('');
  }
  const shown = expanded ? itemsHtml : itemsHtml.slice(0, LEGEND_PREVIEW_LIMIT);
  const toggleBtn = `<button type="button" class="legend-toggle-btn" id="${toggleId}">${expanded ? '收合 ▲' : `顯示全部（共 ${total} 個）▾`}</button>`;
  return shown.join('') + toggleBtn;
}

function renderGenreLegend(){
  const genreCounts = new Map();
  games.forEach(g => (g.genres||[]).forEach(t => genreCounts.set(t, (genreCounts.get(t)||0) + 1)));
  const genres = [...genreCounts.keys()].sort((a,b)=> genreCounts.get(b) - genreCounts.get(a) || a.localeCompare(b));
  if(genres.length === 0){
    genreLegendList.innerHTML = `<div class="genre-legend-empty">尚未有任何類型標籤 — 新增桌遊時填寫「類型」欄位後，會自動列在這裡。</div>`;
    return;
  }
  const itemsHtml = genres.map(t=>{
    const note = (genreNotes[t] || '').trim();
    const noteHtml = note ? escapeHtml(note) : (isOwner ? '點選鉛筆新增說明' : '尚無說明');
    const pencil = isOwner
      ? `<svg class="genre-note-pencil" data-genre="${escapeHtml(t)}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`
      : '';
    return `
    <div class="genre-legend-item" data-genre="${escapeHtml(t)}">
      <div class="genre-legend-head">
        <span class="tag">${escapeHtml(t)}</span>
        <span class="genre-legend-count">${genreCounts.get(t)} 款</span>
        ${pencil}
      </div>
      <span class="genre-note-text ${note ? '' : 'empty'}">${noteHtml}</span>
    </div>`;
  });
  genreLegendList.innerHTML = buildLegendListHtml(itemsHtml, genreLegendExpanded, 'genre-legend-toggle');
}

function renderSeriesLegend(){
  const seriesCounts = new Map();
  games.forEach(g => { if(g.series) seriesCounts.set(g.series, (seriesCounts.get(g.series)||0) + 1); });
  const seriesNames = [...seriesCounts.keys()].sort((a,b)=> seriesCounts.get(b) - seriesCounts.get(a) || a.localeCompare(b));
  if(seriesNames.length === 0){
    seriesLegendList.innerHTML = `<div class="genre-legend-empty">尚未有任何系列 — 新增桌遊時填寫「系列」欄位後，會自動列在這裡。</div>`;
    return;
  }
  const itemsHtml = seriesNames.map(s=>{
    const note = (seriesNotes[s] || '').trim();
    const noteHtml = note ? escapeHtml(note) : (isOwner ? '點選鉛筆新增說明' : '尚無說明');
    const pencil = isOwner
      ? `<svg class="series-note-pencil" data-series="${escapeHtml(s)}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`
      : '';
    return `
    <div class="genre-legend-item" data-series="${escapeHtml(s)}">
      <div class="genre-legend-head">
        <span class="tag-series">${escapeHtml(s)}</span>
        <span class="genre-legend-count">${seriesCounts.get(s)} 款</span>
        ${pencil}
      </div>
      <span class="genre-note-text ${note ? '' : 'empty'}">${noteHtml}</span>
    </div>`;
  });
  seriesLegendList.innerHTML = buildLegendListHtml(itemsHtml, seriesLegendExpanded, 'series-legend-toggle');
}
seriesLegendList.addEventListener('click', (e)=>{
  const toggle = e.target.closest('#series-legend-toggle');
  if(toggle){
    seriesLegendExpanded = !seriesLegendExpanded;
    renderSeriesLegend();
    return;
  }
  const pencil = e.target.closest('.series-note-pencil');
  if(pencil){
    if(!isOwner) return;
    const series = pencil.dataset.series;
    const current = seriesNotes[series] || '';
    const val = prompt(`請輸入「${series}」系列的簡介說明：`, current);
    if(val === null) return;
    seriesNotes[series] = val.trim();
    saveSeriesNotes();
    renderSeriesLegend();
    return;
  }
  const card = e.target.closest('.genre-legend-item');
  if(card){
    filterBySeriesFromHome(card.dataset.series);
  }
});

function filterBySeriesFromHome(series){
  selectedPlayers.clear();
  selectedLangs.clear();
  selectedTypes.clear();
  selectedGenres.clear();
  selectedSeries.clear();
  selectedSeries.add(series);
  selectedYears.clear();
  selectedDifficulties.clear();
  document.getElementById('search-input').value = '';
  updateLangFilterOptions();
  updateGenreFilterOptions();
  updateSeriesFilterOptions();
  updateYearFilterOptions();
  document.querySelectorAll('#filter-players-group input, #filter-difficulty-group input, #filter-type-group input')
    .forEach(cb => cb.checked = false);
  currentPage = 1;
  homeView.style.display = 'none';
  libraryView.style.display = 'block';
  renderGrid();
  window.scrollTo({top:0, behavior:'smooth'});
}

/* ---------- Daily pick (今日推薦) ---------- */
function getDailyPick(){
  if(games.length === 0) return null;
  if(featuredGameId){
    const picked = games.find(g => g.id === featuredGameId);
    if(picked) return picked;
  }
  const baseGames = games.filter(g => g.gameType !== 'expansion');
  const pool = baseGames.length > 0 ? baseGames : games;
  const sorted = [...pool].sort((a,b)=> (a.id||'').localeCompare(b.id||''));
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
  let hash = 0;
  for(let i=0; i<dateStr.length; i++){ hash = (hash*31 + dateStr.charCodeAt(i)) >>> 0; }
  return sorted[hash % sorted.length];
}

function renderDailyPick(){
  const pick = getDailyPick();
  if(!pick){ dailyPickSection.innerHTML = ''; return; }
  const now = new Date();
  const isFeatured = !!(featuredGameId && pick.id === featuredGameId);
  const dateLabel = isFeatured ? '📌 管理者指定推薦' : `📅 ${now.getMonth()+1} 月 ${now.getDate()} 日．今日推薦`;
  const manageBtn = isOwner ? `<button type="button" class="daily-pick-manage-btn" id="daily-pick-manage-btn">管理</button>` : '';
  const genreTags = (pick.genres||[]).slice(0,3).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join('');
  const imgHtml = pick.image
    ? `<img src="${pick.image}" alt="${escapeHtml(pick.name)}">`
    : `<div class="placeholder">尚未上傳圖片</div>`;
  dailyPickSection.innerHTML = `
    <div class="daily-pick-label-row">
      <div class="daily-pick-label">${dateLabel}</div>
      ${manageBtn}
    </div>
    <div class="daily-pick-card" data-id="${pick.id}">
      <div class="daily-pick-img">${imgHtml}</div>
      <div class="daily-pick-body">
        <div class="daily-pick-name">${escapeHtml(pick.name)}</div>
        ${pick.nameEn ? `<div class="card-name-en">${escapeHtml(pick.nameEn)}</div>` : ''}
        ${pick.difficulty ? `<div class="difficulty-stars">${renderStars(pick.difficulty)}</div>` : ''}
        <div class="tags">${genreTags}</div>
        <div class="daily-pick-desc">${escapeHtml(pick.desc || '一起來認識這款桌遊吧！')}</div>
        <button type="button" class="btn-daily-pick-detail">查看詳情 →</button>
      </div>
    </div>`;
}
dailyPickSection.addEventListener('click', (e)=>{
  const manageBtn = e.target.closest('#daily-pick-manage-btn');
  if(manageBtn){
    if(!isOwner) return;
    populateDailyPickSelect();
    dailyPickManagerOverlay.classList.add('show');
    return;
  }
  const card = e.target.closest('.daily-pick-card');
  if(!card) return;
  const g = games.find(x => x.id === card.dataset.id);
  if(g) openDetailModal(g);
});

function populateDailyPickSelect(){
  const sortedGames = [...games].sort((a,b)=> (a.name||'').localeCompare(b.name||'', undefined, {sensitivity:'base'}));
  dailyPickSelect.innerHTML = '<option value="">自動（依日期輪替）</option>' +
    sortedGames.map(g => `<option value="${g.id}" ${g.id===featuredGameId?'selected':''}>${escapeHtml(g.name)}</option>`).join('');
}
dailyPickManagerClose.addEventListener('click', ()=> dailyPickManagerOverlay.classList.remove('show'));
dailyPickManagerCloseBtn.addEventListener('click', ()=> dailyPickManagerOverlay.classList.remove('show'));
dailyPickManagerOverlay.addEventListener('click', (e)=>{ if(e.target === dailyPickManagerOverlay) dailyPickManagerOverlay.classList.remove('show'); });
dailyPickApplyBtn.addEventListener('click', async ()=>{
  if(!isOwner) return;
  const val = dailyPickSelect.value || null;
  featuredGameId = val;
  await saveFeaturedGameId(val);
  renderDailyPick();
  dailyPickManagerOverlay.classList.remove('show');
  showToast(val ? '已指定今日推薦桌遊' : '已改回自動每日輪替');
});

genreLegendList.addEventListener('click', (e)=>{
  const toggle = e.target.closest('#genre-legend-toggle');
  if(toggle){
    genreLegendExpanded = !genreLegendExpanded;
    renderGenreLegend();
    return;
  }
  const pencil = e.target.closest('.genre-note-pencil');
  if(pencil){
    if(!isOwner) return;
    const genre = pencil.dataset.genre;
    const current = genreNotes[genre] || '';
    const val = prompt(`請輸入「${genre}」的簡介說明：`, current);
    if(val === null) return;
    genreNotes[genre] = val.trim();
    saveGenreNotes();
    renderGenreLegend();
    return;
  }
  const card = e.target.closest('.genre-legend-item');
  if(card){
    filterByGenreFromHome(card.dataset.genre);
  }
});

function filterByGenreFromHome(genre){
  selectedPlayers.clear();
  selectedLangs.clear();
  selectedTypes.clear();
  selectedGenres.clear();
  selectedGenres.add(genre);
  selectedSeries.clear();
  selectedYears.clear();
  selectedDifficulties.clear();
  document.getElementById('search-input').value = '';
  updateLangFilterOptions();
  updateGenreFilterOptions();
  updateSeriesFilterOptions();
  updateYearFilterOptions();
  document.querySelectorAll('#filter-players-group input, #filter-difficulty-group input, #filter-type-group input')
    .forEach(cb => cb.checked = false);
  currentPage = 1;
  homeView.style.display = 'none';
  libraryView.style.display = 'block';
  renderGrid();
  window.scrollTo({top:0, behavior:'smooth'});
}

function buildTagGroup(items, tagClass, filterType){
  if(!items || items.length === 0) return '';
  if(items.length === 1){
    return `<span class="${tagClass} filter-tag" data-filter="${filterType}" data-value="${escapeHtml(items[0])}">${escapeHtml(items[0])}</span>`;
  }
  const fullList = items.map(v=>`<span class="${tagClass} filter-tag" data-filter="${filterType}" data-value="${escapeHtml(v)}">${escapeHtml(v)}</span>`).join('');
  return `<div class="tag-hover-group">
    <span class="${tagClass} tag-summary">${escapeHtml(items[0])} +${items.length-1}</span>
    <div class="tag-dropdown-list">${fullList}</div>
  </div>`;
}

function renderCard(g, stackInfo){
  const players = g.minPlayers === g.maxPlayers ? `${g.minPlayers} 人` : `${g.minPlayers}–${g.maxPlayers} 人`;
  const time = g.minTime === g.maxTime ? `${g.minTime} 分鐘` : `${g.minTime}–${g.maxTime} 分鐘`;
  const genreHtml = buildTagGroup(g.genres, 'tag', 'genre');
  const langHtml = buildTagGroup(g.languages, 'tag-lang', 'lang');
  const expansionTag = g.gameType === 'expansion'
    ? `<span class="tag-expansion">擴充${g.standalone ? '・可獨立' : ''}</span>` : '';
  const seriesTag = g.series ? `<span class="tag-series filter-tag" data-filter="series" data-value="${escapeHtml(g.series)}">${escapeHtml(g.series)} 系列</span>` : '';
  const stackCountNote = stackInfo ? `<div class="stack-count-note">📚 這個系列共有 ${stackInfo.count} 款作品</div>` : '';
  const baseGameNote = (g.gameType === 'expansion' && g.baseGameName)
    ? `<div class="base-game-note">→ 擴充自「${escapeHtml(g.baseGameName)}」</div>` : '';
  const imgHtml = g.image
    ? `<img src="${g.image}" alt="${escapeHtml(g.name)}">`
    : `<div class="placeholder">尚未上傳圖片</div>`;
  const cornerBadges = (expansionTag || seriesTag || langHtml)
    ? `<div class="card-img-badges">${expansionTag}${seriesTag}${langHtml}</div>` : '';
  const newBadge = isNewGame(g) ? `<div class="card-new-badge">新發現！</div>` : '';
  const cardHtml = `
  <div class="card${stackInfo ? ' stack-card' : ''}" data-id="${g.id}">
    <div class="card-img">${imgHtml}${cornerBadges}${newBadge}</div>
    <div class="card-body">
      <div class="card-name">${escapeHtml(g.name)}</div>
      ${g.nameEn ? `<div class="card-name-en">${escapeHtml(g.nameEn)}</div>` : ''}
      ${g.year ? `<div class="card-year">${CALENDAR_ICON}${g.year}</div>` : ''}
      ${g.difficulty ? `<div class="difficulty-stars">${renderStars(g.difficulty)}</div>` : ''}
      ${stackCountNote}
      ${genreHtml ? `<div class="tags">${genreHtml}</div>` : ''}
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
        ${stackInfo ? `<button type="button" class="stack-cover-btn" data-series="${escapeHtml(g.series)}">選擇封面</button>` : ''}
      </div>` : ''}
    </div>
  </div>`;
  if(!stackInfo) return cardHtml;
  return `
  <div class="stack-wrapper">
    <div class="stack-layer layer-b"></div>
    <div class="stack-layer layer-a"></div>
    ${cardHtml}
  </div>`;
}

function currentFilters(){
  return {
    q: document.getElementById('search-input').value.trim().toLowerCase()
  };
}

function setFacetBadge(el, size){
  if(size > 0){
    el.textContent = size;
    el.style.display = 'flex';
  } else {
    el.style.display = 'none';
  }
}

function updateFilterBadge(){
  setFacetBadge(badgePlayers, selectedPlayers.size);
  setFacetBadge(badgeLang, selectedLangs.size);
  setFacetBadge(badgeGenre, selectedGenres.size);
  setFacetBadge(badgeSeries, selectedSeries.size);
  setFacetBadge(badgeYear, selectedYears.size);
  setFacetBadge(badgeDifficulty, selectedDifficulties.size);
  setFacetBadge(badgeType, selectedTypes.size);
  const count = selectedPlayers.size + selectedLangs.size + selectedTypes.size +
    selectedGenres.size + selectedSeries.size + selectedYears.size + selectedDifficulties.size;
  setFacetBadge(masterFilterBadge, count);
  resetFiltersBtn.style.display = count > 0 ? 'flex' : 'none';
}

function renderGrid(){
  const {q} = currentFilters();
  let list = games;
  if(q){
    list = list.filter(g =>
      g.name.toLowerCase().includes(q) ||
      (g.nameEn||'').toLowerCase().includes(q) ||
      (g.genres||[]).some(t=>t.toLowerCase().includes(q)) ||
      (g.languages||[]).some(t=>t.toLowerCase().includes(q)) ||
      (g.series||'').toLowerCase().includes(q) ||
      (g.baseGameName||'').toLowerCase().includes(q)
    );
  }
  if(selectedPlayers.size > 0){
    list = list.filter(g => [...selectedPlayers].some(p=>{
      const n = parseInt(p, 10);
      return n >= 6 ? g.maxPlayers >= 6 : (g.minPlayers <= n && g.maxPlayers >= n);
    }));
  }
  if(selectedLangs.size > 0){
    list = list.filter(g => (g.languages||[]).some(l => selectedLangs.has(l)));
  }
  if(selectedTypes.size > 0){
    list = list.filter(g => {
      const type = g.gameType || 'base';
      if(selectedTypes.has(type)) return true;
      if(selectedTypes.has('standalone') && type === 'expansion' && g.standalone) return true;
      return false;
    });
  }
  if(selectedGenres.size > 0){
    list = list.filter(g => (g.genres||[]).some(t => selectedGenres.has(t)));
  }
  if(selectedSeries.size > 0){
    list = list.filter(g => g.series && selectedSeries.has(g.series));
  }
  if(selectedYears.size > 0){
    list = list.filter(g => g.year && selectedYears.has(String(g.year)));
  }
  if(selectedDifficulties.size > 0){
    list = list.filter(g => g.difficulty && selectedDifficulties.has(String(g.difficulty)));
  }
  updateFilterBadge();
  countLabel.textContent = games.length;
  list = applySort(list, sortSelect.value);
  resultsCountEl.style.display = games.length > 0 ? 'block' : 'none';
  resultsCountEl.innerHTML = `符合條件：<strong>${list.length}</strong> / ${games.length} 款桌遊`;
  if(list.length === 0){
    grid.style.display = 'none';
    emptyEl.style.display = 'block';
    emptyEl.textContent = games.length === 0
      ? '尚未收錄任何桌遊 — 點選「新增桌遊」開始建立共用收藏'
      : '找不到符合條件的桌遊';
    paginationEl.innerHTML = '';
  } else {
    grid.style.display = 'grid';
    emptyEl.style.display = 'none';
    const displayList = buildDisplayList(list);
    const totalPages = Math.max(1, Math.ceil(displayList.length / pageSize));
    if(currentPage > totalPages) currentPage = totalPages;
    if(currentPage < 1) currentPage = 1;
    const pageItems = displayList.slice((currentPage-1)*pageSize, currentPage*pageSize);
    grid.innerHTML = pageItems.map(item =>
      item.type === 'stack' ? renderCard(item.cover, {count: item.games.length}) : renderCard(item.game)
    ).join('');
    renderPagination(totalPages);
  }
}

function getSeriesCover(seriesGames, seriesName){
  const pickedId = seriesCovers[seriesName];
  if(pickedId){
    const picked = seriesGames.find(x => x.id === pickedId);
    if(picked) return picked;
  }
  const baseGames = seriesGames.filter(g => g.gameType !== 'expansion');
  const pool = baseGames.length > 0 ? baseGames : seriesGames;
  return [...pool].sort((a,b)=> ((a.createdAt&&a.createdAt.seconds)||0) - ((b.createdAt&&b.createdAt.seconds)||0))[0];
}

function buildDisplayList(list){
  if(selectedSeries.size > 0){
    return list.map(g => ({type:'single', game: g}));
  }
  const seriesMap = new Map();
  list.forEach(g=>{
    if(g.series){
      if(!seriesMap.has(g.series)) seriesMap.set(g.series, []);
      seriesMap.get(g.series).push(g);
    }
  });
  const seen = new Set();
  const result = [];
  list.forEach(g=>{
    if(g.series){
      if(seen.has(g.series)) return;
      seen.add(g.series);
      const seriesGames = seriesMap.get(g.series);
      if(seriesGames.length === 1){
        result.push({type:'single', game: seriesGames[0]});
      } else {
        result.push({type:'stack', series: g.series, games: seriesGames, cover: getSeriesCover(seriesGames, g.series)});
      }
    } else {
      result.push({type:'single', game: g});
    }
  });
  return result;
}

function goToPage(n){
  currentPage = n;
  renderGrid();
  document.getElementById('library-view').scrollIntoView({behavior:'smooth', block:'start'});
}

function renderPagination(totalPages){
  if(totalPages <= 1){ paginationEl.innerHTML = ''; return; }
  let html = `<button class="page-btn" data-page="${currentPage-1}" ${currentPage<=1?'disabled':''}>‹</button>`;
  for(let i=1; i<=totalPages; i++){
    if(i===1 || i===totalPages || Math.abs(i-currentPage)<=1){
      html += `<button class="page-btn ${i===currentPage?'active':''}" data-page="${i}">${i}</button>`;
    } else if(i === currentPage-2 || i === currentPage+2){
      html += `<span class="page-btn page-ellipsis">…</span>`;
    }
  }
  html += `<button class="page-btn" data-page="${currentPage+1}" ${currentPage>=totalPages?'disabled':''}>›</button>`;
  paginationEl.innerHTML = html;
}
paginationEl.addEventListener('click', (e)=>{
  const btn = e.target.closest('button.page-btn');
  if(!btn || btn.disabled) return;
  const page = parseInt(btn.dataset.page, 10);
  if(!isNaN(page)) goToPage(page);
});
pageSizeSelect.addEventListener('change', ()=>{
  pageSize = parseInt(pageSizeSelect.value, 10);
  currentPage = 1;
  renderGrid();
});

/* ---------- Modal ---------- */
function openModal(mode, game){
  editingId = mode === 'edit' ? game.id : null;
  document.getElementById('modal-title').textContent = mode === 'edit' ? '編輯桌遊' : '新增桌遊';
  document.getElementById('f-name').value = game ? game.name : '';
  document.getElementById('f-name-en').value = game ? (game.nameEn || '') : '';
  document.getElementById('f-genre').value = game ? (game.genres||[]).join(', ') : '';
  document.getElementById('f-lang').value = game ? (game.languages||[]).join(', ') : '';
  const gameType = game ? (game.gameType || 'base') : 'base';
  document.getElementById('f-type-base').checked = gameType === 'base';
  document.getElementById('f-type-expansion').checked = gameType === 'expansion';
  document.getElementById('f-basegame').value = game ? (game.baseGameName || '') : '';
  standaloneCheckbox.checked = game ? !!game.standalone : false;
  document.getElementById('f-series').value = game ? (game.series || '') : '';
  document.getElementById('f-url').value = game ? (game.url || '') : '';
  document.getElementById('f-year').value = game ? (game.year || '') : '';
  setDifficultyInputValue(game ? (game.difficulty || 0) : 0);
  baseGameField.style.display = gameType === 'expansion' ? 'block' : 'none';
  document.getElementById('f-desc').value = game ? (game.desc||'') : '';
  document.getElementById('f-minp').value = game ? game.minPlayers : '';
  document.getElementById('f-maxp').value = game ? game.maxPlayers : '';
  document.getElementById('f-mint').value = game ? game.minTime : '';
  document.getElementById('f-maxt').value = game ? game.maxTime : '';
  pendingImageData = game ? (game.image || null) : null;
  pendingImageFullData = game ? (game.imageFull || game.image || null) : null;
  if(pendingImageData){
    imgPreview.src = pendingImageData; imgPreview.style.display='block'; imgHint.textContent='點擊更換圖片';
    imgRemoveBtn.style.display = 'inline-block';
    imgResizeBtn.style.display = 'inline-block';
  } else {
    imgPreview.style.display='none'; imgHint.textContent='點擊或拖曳圖片到此處上傳';
    imgRemoveBtn.style.display = 'none';
    imgResizeBtn.style.display = 'none';
  }
  overlay.classList.add('show');
}
function closeModal(){
  overlay.classList.remove('show');
  form.reset();
  imgPreview.style.display='none';
  imgHint.textContent='點擊或拖曳圖片到此處上傳';
  imgRemoveBtn.style.display = 'none';
  imgResizeBtn.style.display = 'none';
  pendingImageData = null;
  pendingImageFullData = null;
  editingId = null;
  baseGameField.style.display = 'none';
  setDifficultyInputValue(0);
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
function compressImage(file, maxDim, quality){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = (e)=>{
      const img = new Image();
      img.onload = ()=>{
        let w = img.width, h = img.height;
        if(w > h && w > maxDim){ h = Math.round(h*maxDim/w); w = maxDim; }
        else if(h > maxDim){ w = Math.round(w*maxDim/h); h = maxDim; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleImageFile(file){
  if(!file) return;
  openCropTool(file, (thumbUrl, fullUrl)=>{
    pendingImageData = thumbUrl;
    pendingImageFullData = fullUrl;
    imgPreview.src = pendingImageData;
    imgPreview.style.display = 'block';
    imgHint.textContent = '點擊更換圖片';
    imgRemoveBtn.style.display = 'inline-block';
    imgResizeBtn.style.display = 'inline-block';
  });
}
imgInput.addEventListener('change', (e)=> handleImageFile(e.target.files[0]));

imgRemoveBtn.addEventListener('click', ()=>{
  if(!pendingImageData) return;
  if(!confirm('確定要移除這張圖片嗎？')) return;
  pendingImageData = null;
  pendingImageFullData = null;
  imgInput.value = '';
  imgPreview.src = '';
  imgPreview.style.display = 'none';
  imgHint.textContent = '點擊或拖曳圖片到此處上傳';
  imgRemoveBtn.style.display = 'none';
  imgResizeBtn.style.display = 'none';
});

imgResizeBtn.addEventListener('click', ()=>{
  if(!pendingImageFullData && !pendingImageData) return;
  openCropTool(pendingImageFullData || pendingImageData, (thumbUrl, fullUrl)=>{
    pendingImageData = thumbUrl;
    pendingImageFullData = fullUrl;
    imgPreview.src = pendingImageData;
  });
});

/* ---------- Image crop / reposition tool ---------- */
const cropOverlay = document.getElementById('crop-overlay');
const cropClose = document.getElementById('crop-close');
const cropCancel = document.getElementById('crop-cancel');
const cropApply = document.getElementById('crop-apply');
const cropViewport = document.getElementById('crop-viewport');
const cropImg = document.getElementById('crop-img');
const FULL_IMAGE_MAX_DIM = 1400;
let cropState = null;
let cropDragging = false;
let cropDragStartX = 0, cropDragStartY = 0, cropStartOffsetX = 0, cropStartOffsetY = 0;

function openCropTool(fileOrDataUrl, callback){
  if(typeof fileOrDataUrl === 'string'){
    loadCropSource(fileOrDataUrl, callback);
  } else {
    const reader = new FileReader();
    reader.onload = (e)=> loadCropSource(e.target.result, callback);
    reader.readAsDataURL(fileOrDataUrl);
  }
}
function loadCropSource(dataUrl, callback){
  const img = new Image();
  img.onload = ()=>{
    cropOverlay.classList.add('show');
    requestAnimationFrame(()=>{
      const vw = cropViewport.clientWidth;
      const vh = cropViewport.clientHeight;
      const scale = Math.max(vw / img.naturalWidth, vh / img.naturalHeight);
      const dispW = img.naturalWidth * scale;
      const dispH = img.naturalHeight * scale;
      cropState = {
        naturalW: img.naturalWidth, naturalH: img.naturalHeight,
        scale, vw, vh, dispW, dispH,
        offsetX: (vw - dispW) / 2, offsetY: (vh - dispH) / 2,
        dataUrl, callback
      };
      cropImg.src = dataUrl;
      cropImg.style.width = dispW + 'px';
      cropImg.style.height = dispH + 'px';
      updateCropImgTransform();
    });
  };
  img.src = dataUrl;
}
function updateCropImgTransform(){
  cropImg.style.transform = `translate(${cropState.offsetX}px, ${cropState.offsetY}px)`;
}
function clampCropOffset(){
  const minX = cropState.vw - cropState.dispW;
  const minY = cropState.vh - cropState.dispH;
  cropState.offsetX = Math.min(0, Math.max(minX, cropState.offsetX));
  cropState.offsetY = Math.min(0, Math.max(minY, cropState.offsetY));
}
function closeCropTool(){
  cropOverlay.classList.remove('show');
  cropState = null;
}
cropViewport.addEventListener('pointerdown', (e)=>{
  if(!cropState) return;
  cropDragging = true;
  cropViewport.classList.add('dragging');
  cropDragStartX = e.clientX; cropDragStartY = e.clientY;
  cropStartOffsetX = cropState.offsetX; cropStartOffsetY = cropState.offsetY;
  cropViewport.setPointerCapture(e.pointerId);
});
cropViewport.addEventListener('pointermove', (e)=>{
  if(!cropDragging || !cropState) return;
  cropState.offsetX = cropStartOffsetX + (e.clientX - cropDragStartX);
  cropState.offsetY = cropStartOffsetY + (e.clientY - cropDragStartY);
  clampCropOffset();
  updateCropImgTransform();
});
function endCropDrag(){ cropDragging = false; cropViewport.classList.remove('dragging'); }
cropViewport.addEventListener('pointerup', endCropDrag);
cropViewport.addEventListener('pointercancel', endCropDrag);
cropViewport.addEventListener('pointerleave', ()=>{ if(cropDragging) endCropDrag(); });
cropClose.addEventListener('click', closeCropTool);
cropCancel.addEventListener('click', closeCropTool);
cropOverlay.addEventListener('click', (e)=>{ if(e.target === cropOverlay) closeCropTool(); });
cropApply.addEventListener('click', ()=>{
  if(!cropState) return;
  const { naturalW, naturalH, scale, offsetX, offsetY, vw, vh, dataUrl, callback } = cropState;
  const sx = -offsetX / scale, sy = -offsetY / scale, sw = vw / scale, sh = vh / scale;
  const outW = 640, outH = Math.round(outW * (vh / vw));
  const srcImg = new Image();
  srcImg.onload = ()=>{
    // 縮圖：依選取範圍裁切
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = outW; thumbCanvas.height = outH;
    thumbCanvas.getContext('2d').drawImage(srcImg, sx, sy, sw, sh, 0, 0, outW, outH);
    const thumbDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.75);

    // 完整大小版本：不裁切，只縮放到安全範圍內，供放大檢視使用
    let fw = naturalW, fh = naturalH;
    if(fw > fh && fw > FULL_IMAGE_MAX_DIM){ fh = Math.round(fh * FULL_IMAGE_MAX_DIM / fw); fw = FULL_IMAGE_MAX_DIM; }
    else if(fh > FULL_IMAGE_MAX_DIM){ fw = Math.round(fw * FULL_IMAGE_MAX_DIM / fh); fh = FULL_IMAGE_MAX_DIM; }
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = fw; fullCanvas.height = fh;
    fullCanvas.getContext('2d').drawImage(srcImg, 0, 0, fw, fh);
    const fullDataUrl = fullCanvas.toDataURL('image/jpeg', 0.82);

    callback(thumbDataUrl, fullDataUrl);
    closeCropTool();
  };
  srcImg.src = dataUrl;
});

/* form submit */
form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  if(!isOwner){ showToast('只有管理者可以儲存變更'); return; }
  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true; saveBtn.textContent = '儲存中…';

  const name = document.getElementById('f-name').value.trim();
  const nameEn = document.getElementById('f-name-en').value.trim();
  const genres = document.getElementById('f-genre').value.split(',').map(s=>s.trim()).filter(Boolean);
  const languages = document.getElementById('f-lang').value.split(',').map(s=>s.trim()).filter(Boolean);
  const gameType = document.getElementById('f-type-expansion').checked ? 'expansion' : 'base';
  const baseGameName = document.getElementById('f-basegame').value.trim();
  const standalone = gameType === 'expansion' ? standaloneCheckbox.checked : false;
  const series = document.getElementById('f-series').value.trim();
  const url = document.getElementById('f-url').value.trim();
  const yearRaw = document.getElementById('f-year').value.trim();
  const year = yearRaw ? parseInt(yearRaw, 10) : null;
  const difficultyRaw = parseInt(difficultyInputEl.value, 10);
  const difficulty = difficultyRaw > 0 ? difficultyRaw : null;
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
    name, nameEn, genres, languages, desc, minPlayers, maxPlayers, minTime, maxTime,
    gameType, baseGameName: gameType === 'expansion' ? baseGameName : '', standalone, series, url, year, difficulty,
    image: pendingImageData || null, imageFull: pendingImageFullData || null
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

function metaRow(label, valueHtml){
  return `<div class="detail-meta-row"><div class="detail-meta-label">${label}</div><div class="detail-meta-value">${valueHtml}</div></div>`;
}

function buildDetailMeta(g){
  let rows = '';
  const typeBadge = g.gameType === 'expansion'
    ? `<span class="tag-expansion">擴充</span>`
    : `<span class="tag-base">主遊戲</span>`;
  const baseGameNote = (g.gameType === 'expansion' && g.baseGameName)
    ? `<span class="detail-meta-note">擴充自「${escapeHtml(g.baseGameName)}」</span>` : '';
  const standaloneNote = (g.gameType === 'expansion' && g.standalone)
    ? `<span class="detail-meta-note">可獨立遊玩，不需要主遊戲</span>` : '';
  rows += metaRow('主遊戲／擴充', typeBadge + baseGameNote + standaloneNote);

  if(g.series){
    rows += metaRow('系列', `<span class="tag-series">${escapeHtml(g.series)}</span>`);
  }
  if((g.genres||[]).length){
    rows += metaRow('類型', g.genres.map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join(''));
  }
  if((g.languages||[]).length){
    rows += metaRow('語言版本', g.languages.map(t=>`<span class="tag-lang">${escapeHtml(t)}</span>`).join(''));
  }
  return rows;
}

function openDetailModal(g){
  const players = g.minPlayers === g.maxPlayers ? `${g.minPlayers} 人` : `${g.minPlayers}–${g.maxPlayers} 人`;
  const time = g.minTime === g.maxTime ? `${g.minTime} 分鐘` : `${g.minTime}–${g.maxTime} 分鐘`;

  const fullImg = g.imageFull || g.image;
  detailImg.innerHTML = fullImg
    ? `<img src="${fullImg}" alt="${escapeHtml(g.name)}">`
    : `<div class="placeholder">尚未上傳圖片</div>`;
  detailName.textContent = g.name;
  detailNameEn.textContent = g.nameEn || '';
  detailDifficulty.innerHTML = g.difficulty ? renderStars(g.difficulty) : '';
  detailMeta.innerHTML = buildDetailMeta(g);
  detailStats.innerHTML = `${g.year ? `<div class="stat">${CALENDAR_ICON}${g.year}</div>` : ''}<div class="stat">${DICE_ICON}${players}</div><div class="stat">${HOURGLASS_ICON}${time}</div>`;
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
  const coverBtn = e.target.closest('.stack-cover-btn');
  if(coverBtn){
    e.stopPropagation();
    if(!isOwner) return;
    openSeriesCoverPicker(coverBtn.dataset.series);
    return;
  }

  const filterTagEl = e.target.closest('.filter-tag');
  if(filterTagEl){
    e.stopPropagation();
    const type = filterTagEl.dataset.filter;
    const value = filterTagEl.dataset.value;
    if(type === 'genre'){
      selectedGenres.add(value);
      updateGenreFilterOptions();
    } else if(type === 'series'){
      selectedSeries.add(value);
      updateSeriesFilterOptions();
    } else if(type === 'lang'){
      selectedLangs.add(value);
      updateLangFilterOptions();
    }
    onFilterChanged();
    showToast(`已套用篩選：${value}`);
    window.scrollTo({top:0, behavior:'smooth'});
    return;
  }

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
function onFilterChanged(){
  currentPage = 1;
  renderGrid();
}
document.getElementById('search-input').addEventListener('input', onFilterChanged);
sortSelect.addEventListener('change', onFilterChanged);

function wireCheckboxGroup(container, targetSet){
  container.addEventListener('change', (e)=>{
    if(e.target.type !== 'checkbox') return;
    const val = e.target.value;
    if(e.target.checked){ targetSet.add(val); } else { targetSet.delete(val); }
    onFilterChanged();
  });
}
wireCheckboxGroup(filterPlayersGroup, selectedPlayers);
wireCheckboxGroup(filterLangGroup, selectedLangs);
wireCheckboxGroup(filterGenreGroup, selectedGenres);
wireCheckboxGroup(filterSeriesGroup, selectedSeries);
wireCheckboxGroup(filterYearGroup, selectedYears);
wireCheckboxGroup(filterDifficultyGroup, selectedDifficulties);
wireCheckboxGroup(filterTypeGroup, selectedTypes);

resetFiltersBtn.addEventListener('click', ()=>{
  document.getElementById('search-input').value = '';
  selectedPlayers.clear();
  selectedLangs.clear();
  selectedTypes.clear();
  selectedGenres.clear();
  selectedSeries.clear();
  selectedYears.clear();
  selectedDifficulties.clear();
  filterMasterGrid.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
  document.querySelectorAll('.facet-dropdown.show').forEach(d => d.classList.remove('show'));
  onFilterChanged();
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

/* subtitle editing */
customSubtitleInput.addEventListener('input', ()=> autoGrowTextarea(customSubtitleInput));
customSubtitleInput.addEventListener('blur', ()=>{
  if(!isOwner) return;
  const val = customSubtitleInput.value.trim();
  customSubtitleInput.value = val;
  autoGrowTextarea(customSubtitleInput);
  saveSubtitle(val);
  refreshSubtitleVisibility();
});
subtitlePencil.addEventListener('click', ()=>{
  if(!isOwner){ showToast('只有管理者可以修改副標'); return; }
  customSubtitleInput.focus();
});

/* recommendation content editing */
recommendContent.addEventListener('input', ()=> autoGrowTextarea(recommendContent));
recommendContent.addEventListener('blur', ()=>{
  if(!isOwner) return;
  const val = recommendContent.value.trim();
  recommendContent.value = val;
  autoGrowTextarea(recommendContent);
  saveRecommendation(val);
  refreshRecommendVisibility();
});
recommendPencil.addEventListener('click', ()=>{
  if(!isOwner){ showToast('只有管理者可以修改推薦內容'); return; }
  recommendContent.focus();
});

/* home / library view switching */
enterLibraryBtn.addEventListener('click', ()=>{
  homeView.style.display = 'none';
  libraryView.style.display = 'block';
  window.scrollTo({top:0, behavior:'smooth'});
});
backHomeBtn.addEventListener('click', ()=>{
  libraryView.style.display = 'none';
  homeView.style.display = 'block';
  window.scrollTo({top:0, behavior:'smooth'});
});
enterGalleryBtn.addEventListener('click', ()=>{
  homeView.style.display = 'none';
  galleryView.style.display = 'block';
  window.scrollTo({top:0, behavior:'smooth'});
});
galleryBackHomeBtn.addEventListener('click', ()=>{
  galleryView.style.display = 'none';
  homeView.style.display = 'block';
  window.scrollTo({top:0, behavior:'smooth'});
});

/* banner image upload / remove */
bannerUploadBtn.addEventListener('click', ()=>{
  if(!isOwner){ showToast('只有管理者可以更換橫幅圖片'); return; }
  bannerFileInput.value = '';
  bannerFileInput.click();
});
bannerFileInput.addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file || !isOwner) return;
  const reader = new FileReader();
  reader.onload = (ev)=>{
    const img = new Image();
    img.onload = async ()=>{
      const maxW = 1400;
      let w = img.width, h = img.height;
      if(w > maxW){ h = Math.round(h*maxW/w); w = maxW; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      bannerImg.src = dataUrl;
      bannerImg.style.display = 'block';
      bannerEl.classList.add('has-image');
      bannerRemoveBtn.style.display = 'flex';
      await saveBannerImage(dataUrl);
      showToast('已更新橫幅圖片');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});
bannerRemoveBtn.addEventListener('click', async ()=>{
  if(!isOwner) return;
  if(!confirm('確定要移除橫幅圖片嗎？')) return;
  bannerImg.style.display = 'none';
  bannerEl.classList.remove('has-image');
  bannerRemoveBtn.style.display = 'none';
  await saveBannerImage(null);
  showToast('已移除橫幅圖片');
});

/* filter master panel & list dropdown */
filterMasterBtn.addEventListener('click', (e)=>{
  e.stopPropagation();
  listPanel.classList.remove('show');
  filterMasterBtn.classList.toggle('open');
  filterMasterPanel.classList.toggle('show');
});
listToggleBtn.addEventListener('click', (e)=>{
  e.stopPropagation();
  filterMasterBtn.classList.remove('open');
  filterMasterPanel.classList.remove('show');
  listPanel.classList.toggle('show');
});
document.querySelectorAll('.facet-dropdown').forEach(dropdown=>{
  const btn = dropdown.querySelector('.btn-facet');
  btn.addEventListener('click', (e)=>{
    e.stopPropagation();
    const wasOpen = dropdown.classList.contains('show');
    document.querySelectorAll('.facet-dropdown.show').forEach(d => d.classList.remove('show'));
    if(!wasOpen) dropdown.classList.add('show');
  });
});
document.addEventListener('click', (e)=>{
  if(!e.target.closest('.facet-dropdown')){
    document.querySelectorAll('.facet-dropdown.show').forEach(d => d.classList.remove('show'));
  }
  if(!e.target.closest('.filter-master-panel') && !e.target.closest('#filter-master-btn')){
    filterMasterBtn.classList.remove('open');
    filterMasterPanel.classList.remove('show');
  }
  if(!e.target.closest('.list-dropdown')){
    listPanel.classList.remove('show');
  }
});

/* ---------- Facet order management ---------- */
const FACET_LABELS = {
  players: '遊玩人數', lang: '語言版本', genre: '桌遊類型',
  series: '系列', year: '發行年份', difficulty: '難度', type: '主遊戲／擴充'
};
function applyFacetOrder(){
  facetOrder.forEach(key=>{
    const el = document.querySelector(`.facet-dropdown[data-facet="${key}"]`);
    if(el) filterMasterGrid.appendChild(el);
  });
}
async function saveFacetOrder(){
  try{
    await setDoc(siteMetaRef, { facetOrder }, { merge: true });
  }catch(e){
    showToast('篩選順序儲存失敗，請確認網路連線與 Firebase 設定');
  }
}
function renderFacetOrderList(){
  facetOrderList.innerHTML = facetOrderDraft.map((key, i)=> `
    <div class="facet-order-row" data-key="${key}">
      <div class="facet-order-name">${FACET_LABELS[key] || key}</div>
      <div class="facet-order-actions">
        <button type="button" class="facet-order-move-btn" data-dir="up" data-key="${key}" ${i===0?'disabled':''}>↑</button>
        <button type="button" class="facet-order-move-btn" data-dir="down" data-key="${key}" ${i===facetOrderDraft.length-1?'disabled':''}>↓</button>
      </div>
    </div>`).join('');
}
facetOrderBtn.addEventListener('click', ()=>{
  if(!isOwner){ showToast('只有管理者可以調整篩選順序'); return; }
  facetOrderDraft = [...facetOrder];
  renderFacetOrderList();
  facetOrderOverlay.classList.add('show');
});
facetOrderList.addEventListener('click', (e)=>{
  const btn = e.target.closest('.facet-order-move-btn');
  if(!btn || btn.disabled) return;
  const key = btn.dataset.key;
  const dir = btn.dataset.dir;
  const idx = facetOrderDraft.indexOf(key);
  const swapWith = dir === 'up' ? idx - 1 : idx + 1;
  if(swapWith < 0 || swapWith >= facetOrderDraft.length) return;
  [facetOrderDraft[idx], facetOrderDraft[swapWith]] = [facetOrderDraft[swapWith], facetOrderDraft[idx]];
  renderFacetOrderList();
});
facetOrderClose.addEventListener('click', ()=> facetOrderOverlay.classList.remove('show'));
facetOrderCancel.addEventListener('click', ()=> facetOrderOverlay.classList.remove('show'));
facetOrderOverlay.addEventListener('click', (e)=>{ if(e.target === facetOrderOverlay) facetOrderOverlay.classList.remove('show'); });
facetOrderApply.addEventListener('click', async ()=>{
  facetOrder = [...facetOrderDraft];
  applyFacetOrder();
  await saveFacetOrder();
  facetOrderOverlay.classList.remove('show');
  showToast('已更新篩選順序');
});

/* ---------- Series cover picker ---------- */
function openSeriesCoverPicker(series){
  const seriesGames = games.filter(g => g.series === series);
  if(seriesGames.length === 0){ showToast('找不到這個系列的桌遊'); return; }
  seriesCoverTitle.textContent = `選擇「${series}」系列的封面`;
  const currentCoverId = getSeriesCover(seriesGames, series).id;
  seriesCoverList.innerHTML = seriesGames.map(g => `
    <div class="image-manager-row" data-id="${g.id}">
      <div class="image-manager-thumb">
        ${g.image ? `<img src="${g.image}" alt="">` : `<span class="placeholder-icon">無圖片</span>`}
      </div>
      <div class="image-manager-name">${escapeHtml(g.name)}${g.gameType === 'expansion' ? '（擴充）' : ''}</div>
      <div class="image-manager-actions">
        <button type="button" class="series-cover-pick-btn ${g.id === currentCoverId ? 'current' : ''}" data-id="${g.id}" data-series="${escapeHtml(series)}">
          ${g.id === currentCoverId ? '目前封面' : '設為封面'}
        </button>
      </div>
    </div>`).join('');
  seriesCoverOverlay.classList.add('show');
}
seriesCoverClose.addEventListener('click', ()=> seriesCoverOverlay.classList.remove('show'));
seriesCoverOverlay.addEventListener('click', (e)=>{ if(e.target === seriesCoverOverlay) seriesCoverOverlay.classList.remove('show'); });
seriesCoverList.addEventListener('click', (e)=>{
  const btn = e.target.closest('.series-cover-pick-btn');
  if(!btn || btn.classList.contains('current')) return;
  const series = btn.dataset.series;
  const id = btn.dataset.id;
  seriesCovers[series] = id;
  saveSeriesCovers();
  seriesCoverOverlay.classList.remove('show');
  showToast('已更新系列封面');
  renderGrid();
});

/* ---------- Batch image manager ---------- */
function renderImageManagerList(){
  if(games.length === 0){
    imageManagerList.innerHTML = `<div class="genre-legend-empty">目前還沒有任何桌遊。</div>`;
    updateImageManagerBatchUI();
    return;
  }
  const sorted = [...games].sort((a,b)=> (a.name||'').localeCompare(b.name||'', undefined, {sensitivity:'base'}));
  imageManagerList.innerHTML = sorted.map(g => `
    <div class="image-manager-row" data-id="${g.id}">
      <input type="checkbox" class="img-row-select" data-id="${g.id}" ${selectedImageIds.has(g.id) ? 'checked' : ''}>
      <div class="image-manager-thumb">
        ${g.image ? `<img src="${g.image}" alt="">` : `<span class="placeholder-icon">無圖片</span>`}
      </div>
      <div class="image-manager-name">${escapeHtml(g.name)}</div>
      <div class="image-manager-actions">
        <button type="button" class="img-upload-btn" data-id="${g.id}">上傳</button>
        <input type="file" accept="image/*" class="img-manager-file-input" data-id="${g.id}" style="display:none;">
        <button type="button" class="img-resize-row-btn" data-id="${g.id}" ${g.image ? '' : 'disabled'}>調整大小</button>
        <button type="button" class="img-download-row-btn" data-id="${g.id}" ${g.image ? '' : 'disabled'}>下載</button>
        <button type="button" class="img-remove-row-btn" data-id="${g.id}" ${g.image ? '' : 'disabled'}>移除</button>
      </div>
    </div>`).join('');
  updateImageManagerBatchUI();
}

function updateImageManagerBatchUI(){
  const rowIds = [...games].map(g => g.id);
  // 清掉已經不存在的桌遊 id（例如剛好被刪除）
  [...selectedImageIds].forEach(id => { if(!rowIds.includes(id)) selectedImageIds.delete(id); });
  const count = selectedImageIds.size;
  imageManagerDownloadSelectedBtn.disabled = count === 0;
  imageManagerRemoveSelectedBtn.disabled = count === 0;
  imageManagerDownloadSelectedBtn.textContent = count > 0 ? `下載已選取（${count}）` : '下載已選取';
  imageManagerRemoveSelectedBtn.textContent = count > 0 ? `移除已選取（${count}）` : '移除已選取';
  imageManagerSelectAll.checked = rowIds.length > 0 && rowIds.every(id => selectedImageIds.has(id));
}

function downloadDataUrl(dataUrl, filename){
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function downloadSelectedImages(){
  const ids = [...selectedImageIds].filter(id => {
    const g = games.find(x => x.id === id);
    return g && g.image;
  });
  if(ids.length === 0){ showToast('選取的項目中沒有圖片可下載'); return; }
  if(typeof JSZip === 'undefined'){ showToast('下載元件載入失敗，請確認網路連線後重新整理再試'); return; }
  showToast('打包中，請稍候…');
  const zip = new JSZip();
  const usedNames = new Set();
  ids.forEach(id=>{
    const g = games.find(x => x.id === id);
    const base64Data = (g.imageFull || g.image).split(',')[1];
    const safeBase = (g.name || id).replace(/[\\/:*?"<>|]/g, '_').trim() || id;
    let finalName = `${safeBase}.jpg`;
    let n = 2;
    while(usedNames.has(finalName)){ finalName = `${safeBase}_${n}.jpg`; n++; }
    usedNames.add(finalName);
    zip.file(finalName, base64Data, { base64: true });
  });
  try{
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '桌遊圖片.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`已下載 ${ids.length} 張圖片`);
  }catch(err){
    console.error(err);
    showToast('打包下載失敗，請稍後再試');
  }
}

imageManagerBtn.addEventListener('click', ()=>{
  listPanel.classList.remove('show');
  if(!isOwner){ showToast('只有管理者可以管理圖片'); return; }
  selectedImageIds.clear();
  renderImageManagerList();
  imageManagerOverlay.classList.add('show');
});
imageManagerClose.addEventListener('click', ()=> imageManagerOverlay.classList.remove('show'));
imageManagerOverlay.addEventListener('click', (e)=>{ if(e.target === imageManagerOverlay) imageManagerOverlay.classList.remove('show'); });

imageManagerSelectAll.addEventListener('change', ()=>{
  if(imageManagerSelectAll.checked){
    games.forEach(g => selectedImageIds.add(g.id));
  } else {
    selectedImageIds.clear();
  }
  renderImageManagerList();
});

imageManagerDownloadSelectedBtn.addEventListener('click', downloadSelectedImages);

imageManagerRemoveSelectedBtn.addEventListener('click', async ()=>{
  const ids = [...selectedImageIds].filter(id => {
    const g = games.find(x => x.id === id);
    return g && g.image;
  });
  if(ids.length === 0){ showToast('選取的項目中沒有圖片可移除'); return; }
  if(!confirm(`確定要移除這 ${ids.length} 款桌遊的圖片嗎？`)) return;
  imageManagerRemoveSelectedBtn.disabled = true;
  try{
    for(const id of ids){
      await updateDoc(doc(db, 'games', id), { image: null });
    }
    showToast(`已移除 ${ids.length} 張圖片`);
  }catch(err){
    console.error(err);
    showToast('移除過程中發生錯誤，部分項目可能未完成');
  }
  renderImageManagerList();
});

imageManagerList.addEventListener('change', async (e)=>{
  const rowCheckbox = e.target.closest('.img-row-select');
  if(rowCheckbox){
    const id = rowCheckbox.dataset.id;
    if(rowCheckbox.checked){ selectedImageIds.add(id); } else { selectedImageIds.delete(id); }
    updateImageManagerBatchUI();
    return;
  }
  const fileInput = e.target.closest('.img-manager-file-input');
  if(!fileInput) return;
  const file = fileInput.files[0];
  if(!file) return;
  const id = fileInput.dataset.id;
  const g = games.find(x=>x.id===id);
  if(!g) return;
  openCropTool(file, async (thumbUrl, fullUrl)=>{
    try{
      await updateDoc(doc(db, 'games', id), { image: thumbUrl, imageFull: fullUrl });
      showToast(`已更新「${g.name}」的圖片`);
      renderImageManagerList();
    }catch(err){
      console.error(err);
      showToast('上傳失敗，請稍後再試');
    }
  });
});

imageManagerList.addEventListener('click', (e)=>{
  const uploadBtn = e.target.closest('.img-upload-btn');
  if(uploadBtn){
    const fileInput = uploadBtn.closest('.image-manager-row').querySelector('.img-manager-file-input');
    fileInput.click();
    return;
  }
  const resizeBtn = e.target.closest('.img-resize-row-btn');
  if(resizeBtn && !resizeBtn.disabled){
    const id = resizeBtn.dataset.id;
    const g = games.find(x=>x.id===id);
    if(!g || !g.image) return;
    openCropTool(g.imageFull || g.image, async (thumbUrl, fullUrl)=>{
      try{
        await updateDoc(doc(db, 'games', id), { image: thumbUrl, imageFull: fullUrl });
        showToast(`已調整「${g.name}」的圖片大小`);
        renderImageManagerList();
      }catch(err){
        console.error(err);
        showToast('調整失敗，請稍後再試');
      }
    });
    return;
  }
  const downloadRowBtn = e.target.closest('.img-download-row-btn');
  if(downloadRowBtn && !downloadRowBtn.disabled){
    const id = downloadRowBtn.dataset.id;
    const g = games.find(x=>x.id===id);
    if(!g || !g.image) return;
    downloadDataUrl(g.imageFull || g.image, `${(g.name||'game').replace(/[\\/:*?"<>|]/g,'_')}.jpg`);
    return;
  }
  const removeBtn = e.target.closest('.img-remove-row-btn');
  if(removeBtn && !removeBtn.disabled){
    const id = removeBtn.dataset.id;
    const g = games.find(x=>x.id===id);
    if(!g) return;
    if(!confirm(`確定要移除「${g.name}」的圖片嗎？`)) return;
    updateDoc(doc(db, 'games', id), { image: null, imageFull: null })
      .then(()=>{
        showToast('已移除圖片');
        renderImageManagerList();
      })
      .catch(()=> showToast('移除失敗，請稍後再試'));
  }
});

/* ---------- Download list as CSV ---------- */
function csvEscape(val){
  const s = (val===undefined || val===null) ? '' : String(val);
  if(/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
  return s;
}
downloadBtn.addEventListener('click', ()=>{
  listPanel.classList.remove('show');
  if(games.length === 0){ showToast('目前還沒有任何桌遊可以下載'); return; }
  const headers = ['名稱','別名','類型','所屬主遊戲','可獨立遊玩(是/否)','系列','發行年份','難度(1-5)','桌遊類型(逗號分隔)','語言版本(逗號分隔)','最少人數','最多人數','最少時間(分鐘)','最多時間(分鐘)','網址連結','簡介'];
  const rows = games.map(g => [
    g.name,
    g.nameEn || '',
    g.gameType === 'expansion' ? '擴充' : '主遊戲',
    g.gameType === 'expansion' ? (g.baseGameName||'') : '',
    g.gameType === 'expansion' ? (g.standalone ? '是' : '否') : '',
    g.series || '',
    g.year || '',
    g.difficulty || '',
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
  listPanel.classList.remove('show');
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
  // 名稱,別名,類型,所屬主遊戲,可獨立遊玩,系列,發行年份,難度,桌遊類型,語言版本,最少人數,最多人數,最少時間,最多時間,網址連結,簡介
  const dataRows = rows.slice(1);
  let successCount = 0, skipCount = 0;
  importBtn.disabled = true;
  const originalLabel = importBtn.innerHTML;
  importBtn.innerHTML = '匯入中…';

  for(const r of dataRows){
    const [name, nameEn, typeLabel, baseGameName, standaloneStr, series, yearStr, difficultyStr, genreStr, langStr, minP, maxP, minT, maxT, url, desc] = r;
    const trimmedName = (name||'').trim();
    const minPlayers = parseInt(minP, 10), maxPlayers = parseInt(maxP, 10);
    const minTime = parseInt(minT, 10), maxTime = parseInt(maxT, 10);
    if(!trimmedName || isNaN(minPlayers) || isNaN(maxPlayers) || isNaN(minTime) || isNaN(maxTime)){
      skipCount++; continue;
    }
    const gameType = (typeLabel||'').trim() === '擴充' ? 'expansion' : 'base';
    const standalone = gameType === 'expansion' && (standaloneStr||'').trim() === '是';
    const genres = (genreStr||'').split(/[、,]/).map(s=>s.trim()).filter(Boolean);
    const languages = (langStr||'').split(/[、,]/).map(s=>s.trim()).filter(Boolean);
    const yearParsed = parseInt((yearStr||'').trim(), 10);
    const difficultyParsed = parseInt((difficultyStr||'').trim(), 10);
    const payload = {
      name: trimmedName, nameEn: (nameEn||'').trim(), genres, languages, desc: (desc||'').trim(),
      minPlayers, maxPlayers, minTime, maxTime,
      gameType, baseGameName: gameType === 'expansion' ? (baseGameName||'').trim() : '', standalone,
      series: (series||'').trim(), url: (url||'').trim(), year: isNaN(yearParsed) ? null : yearParsed,
      difficulty: (difficultyParsed >= 1 && difficultyParsed <= 5) ? difficultyParsed : null,
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

/* 定時重繪，讓「新發現！」徽章滿 24 小時後能自動消失（不需重新整理頁面） */
setInterval(()=>{ if(games.length){ renderGrid(); renderDailyPick(); } }, 5 * 60 * 1000);
