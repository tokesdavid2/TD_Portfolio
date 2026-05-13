let selectedCountries = new Set();
let isRatingMode = false;
let currentReviewCountry = null;
let ratingsData = {};
let averageRatings = {};
let currentRating = 0;
let countryNames = {};
let currentUser = null;
const hiddenCountryIds = ['gb-nir', 'path3337', 'tr', 'fo'];
const aliasMap =
{
    'tr': 'path-16',
    'path3337': 'path-5',
    'gb-nir': 'gb-gbn',
	'fo': 'dk'
};
const inverseAliasMap = {};
for (let [alias, canonical] of Object.entries(aliasMap))
{
    if (!inverseAliasMap[canonical]) inverseAliasMap[canonical] = [];
    inverseAliasMap[canonical].push(alias);
}
function getAuthToken()
{
    return localStorage.getItem('authToken');
}
function setAuthToken(token)
{
    localStorage.setItem('authToken', token);
}
function removeAuthToken()
{
    localStorage.removeItem('authToken');
}
function isLoggedIn()
{
    return getAuthToken() !== null;
}
async function loginUser(username, password)
{
    const response = await fetch('/api/login',
        {
        method: 'POST',
        headers:
        {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (response.ok && data.success)
    {
        setAuthToken(data.token);
        currentUser = data.user;
        updateUIForLoggedInUser();
        showWelcomeMessage();
        return (
        {
            success: true,
            message: data.message
        });
    }
    else
    {
        return (
        {
            success: false,
            message: data.error || 'Bejelentkezés sikertelen!'
        });
    }
}
async function signupUser(username, password)
{
    try
    {
        const response = await fetch('/api/signup',
        {
            method: 'POST',
            headers:
            {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok && data.success)
        {
            setAuthToken(data.token);
            currentUser = data.user;
            updateUIForLoggedInUser();
            showWelcomeMessage();
            return (
            {
                success: true,
                message: data.message
            });
        }
        else
        {
            return (
            {
                success: false,
                message: data.error || 'Regisztráció sikertelen!'
            });
        }
    }
    catch (error)
    {
        console.error('Regisztrációs hiba:', error);
        return(
        {
            success: false,
            message: 'ERROR 404 - Szerver nem elérhető!'
        });
    }
}
function logoutUser()
{
    removeAuthToken();
    currentUser = null;
    updateUIForLoggedOutUser();
    alert('Sikeres kijelentkezés')
}
function updateUIForLoggedInUser()
{
    const accountBtn = document.querySelector('.accountBtn');
    accountBtn.textContent = `Kijelentkezés`;
    accountBtn.onclick = () => {
        logoutUser();
    };
    const loginPanel = document.querySelector('.loginPanel');
    loginPanel.style.display = 'none';
}
function updateUIForLoggedOutUser()
{
    const accountBtn = document.querySelector('.accountBtn');
    accountBtn.textContent = 'Belépés';
    accountBtn.onclick = () => {
        const loginPanel = document.querySelector('.loginPanel');
        if (loginPanel.style.display === 'block')
        {
            loginPanel.style.display = 'none';
        }
        else
        {
            loginPanel.style.display = 'block';
        }
    };
}
function showWelcomeMessage()
{
    if (currentUser && currentUser.username)
    {
        const hour = new Date().getHours();
        switch (true)
        {
        case (hour >= 6 && hour < 10):
            return alert(`Jó reggelt, ${currentUser.username}! Üdvözöllek az EuroScrapbookban!`);
        case (hour >= 10 && hour < 19):
            return alert(`Jó napot, ${currentUser.username}! Üdvözöllek az EuroScrapbookban!`);
        case (hour >= 19 && hour < 23):
            return alert(`Jó estét, ${currentUser.username}! Üdvözöllek az EuroScrapbookban!`);
        case (hour >= 0 && hour < 6):
            return alert(`Te meg mit keresel még fent ilyenkor?`);
        }
    }
}
function getCanonicalId(id)
{
    return aliasMap[id] || id;
}
async function loadRatings()
{
    try
    {
        const response = await fetch('/api/ratings');
        const ratings = await response.json();
        ratingsData = {};
        ratings.forEach(rating => {
            if (!ratingsData[rating.ID])
            {
                ratingsData[rating.ID] = [];
            }
            ratingsData[rating.ID].push(rating);
        });
        averageRatings = {};
        Object.keys(ratingsData).forEach(countryId => {
            const countryRatings = ratingsData[countryId];
            const sum = countryRatings.reduce((acc, rating) => acc + parseFloat(rating.ertekeles), 0);
            averageRatings[countryId] = sum / countryRatings.length;
        });
        return true;
    }
    catch (error)
    {
        console.error('Nem sikerült betölteni az értékeléseket:', error);
        return false;
    }
}
async function saveRatingToJSON(countryId, rating, comment)
{
    if (!isLoggedIn())
    {
        alert('A véleményed mentéséhez be kell jelentkezned!');
        return false;
    }
    const newRating =
    {
        ID: countryId,
        ertekeles: rating,
        komment: comment
    };
    try
    {
        const response = await fetch('/api/save-rating',
        {
            method: 'POST',
            headers:
            {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(newRating)
        });
        if (!response.ok)
        {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Nem sikerült elmenteni az értékelést!');
        }
        const result = await response.json();
        await loadRatings();
        applyRatingColors();
        updateCountriesList();
        return true;
    }
    catch (error)
    {
        console.error('Nem sikerült elmenteni az értékelést:', error);
        alert('Hiba történt az értékelés mentése során: ' + error.message);
        return false;
    }
}
function getRatingColor(rating)
{
    switch (true)
    {
        case (rating >= 1 && rating < 2):
            return 'rgb(150, 0, 0)';
        case (rating >= 2 && rating < 2.5):
            return 'rgb(250, 100, 100)';
        case (rating >= 2.5 && rating < 3):
            return 'rgb(250, 175, 175)';
        case (rating === 3):
            return 'rgb(237, 237, 125)';
        case (rating > 3 && rating <= 3.5):
            return 'rgb(175, 250, 175)';
        case (rating > 3.5 && rating <= 4):
            return 'rgb(100, 250, 100)';
        case (rating > 4 && rating <= 5):
            return 'rgb(0, 150, 0)';
    }
}
function generateStars(rating)
{
    const fullStars = Math.round(rating);
    const emptyStars = 5 - fullStars;
    let stars = '';
    for (let i = 0; i < fullStars; i++)
    {
        stars += '⭐';
    }
    for (let i = 0; i < emptyStars; i++)
    {
        stars += '☆';
    }
    return stars;
}
function updateStarRating(rating)
{
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        star.classList.toggle('active', index < rating);
    });
}
async function loadCountryNames()
{
    try
    {
        const response = await fetch('/api/countries');
        countryNames = await response.json();
        return true;
    }
    catch (error)
    {
        console.error('Nem sikerült betölteni az országneveket:', error);
        return false;
    }
}
function deselectAllCountries()
{
    selectedCountries.clear();
    const allPaths = document.querySelectorAll('#terkep path.selected');
    allPaths.forEach(path => {
        path.classList.remove('selected');
        if (path.getAttribute('id') === 'tr')
        {
            path.style.fill = '#E1E1E1';
        }
        else
        {
            path.style.fill = '#C0C1C5';
        }
    });
    updateCountriesList();
}
function clearAllReviews()
{
    const allPaths = document.querySelectorAll('#terkep path.reviewed');
    allPaths.forEach(path => {
        path.classList.remove('reviewed');
        if (path.getAttribute('id') === 'tr')
        {
            path.style.fill = '#E1E1E1';
        }
        else
        {
            path.style.fill = '#C0C1C5';
        }
    });
    updateCountriesList();
}
function applyRatingColors()
{
    Object.keys(averageRatings).forEach(countryId => {
        const idsToColor = [countryId, ...(inverseAliasMap[countryId] || [])];
        idsToColor.forEach(id => {
            const countryPath = document.querySelector(`#terkep path[id="${id}"]`);
            if (countryPath)
            {
                const rating = averageRatings[countryId];
                const color = getRatingColor(rating);
                countryPath.style.fill = color;
                countryPath.classList.add('rated');
            }
			if (allPaths.length > 0)
            {
                const targetPath = allPaths[allPaths.length - 1];
			}
        });
    });
}
function resetRatingColors()
{
    const allPaths = document.querySelectorAll('#terkep path.rated');
    allPaths.forEach(path => {
        path.classList.remove('rated');
        if (path.getAttribute('id') === 'tr')
        {
            path.style.fill = '#E1E1E1';
        }
        else
        {
            path.style.fill = '#C0C1C5';
        }
    });
}
async function updateCountriesList()
{
    const countriesList = document.getElementById('countriesList');
    countriesList.innerHTML = '';
    if (isRatingMode)
    {
        const msg = document.createElement('div');
        msg.className = 'emptyMessage';
        msg.textContent = 'Kattints az országokra a térképen az értékelések elolvasásához!';
        countriesList.appendChild(msg);
        return;
    }
    const visibleCountries = Array.from(selectedCountries).filter(id => !hiddenCountryIds.includes(id) && !aliasMap.hasOwnProperty(id));
    if (visibleCountries.length === 0)
    {
        const msg = document.createElement('div');
        msg.className = 'emptyMessage';
        msg.textContent = 'Kattints az országokra a térképen a területük kiválasztásához!';
        countriesList.appendChild(msg);
        return;
    }
    const idsParam = visibleCountries.join(',');
    try
    {
        const response = await fetch(`/EJS/orszagLista?ids=${encodeURIComponent(idsParam)}`);
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        Array.from(doc.body.children).forEach(child => {
            countriesList.appendChild(child);
        });
    }
    catch (error)
    {
        console.error('Hiba a kijelölt országok lekérdezésekor:', error);
    }
}
function showCountryRatings(countryId)
{
    const countriesList = document.getElementById('countriesList');
    const countryName = countryNames[countryId] || countryId.toUpperCase();
    if (!ratingsData[countryId] || ratingsData[countryId].length === 0)
    {
        const template = document.getElementById('noRatingsTemplate').content.cloneNode(true);
        template.querySelector('.countryName').textContent = countryName;
        countriesList.innerHTML = '';
        countriesList.appendChild(template);
        return;
    }
    const ratings = ratingsData[countryId];
    const avgRating = averageRatings[countryId];
    const template = document.getElementById('countryRatingsTemplate').content.cloneNode(true);
    template.querySelector('.countryName').textContent = countryName;
    template.querySelector('.avgStars').innerHTML = generateStars(avgRating);
    template.querySelector('.avgScore').textContent = `${avgRating.toFixed(1)}/5`;
    template.querySelector('.totalRatings').textContent = `${ratings.length} értékelés`;
    const container = template.querySelector('.ratingsContainer');
    ratings.forEach(rating => {
        const item = document.getElementById('individualRatingTemplate').content.cloneNode(true);
        item.querySelector('.ratingUser').textContent = rating.username;
        item.querySelector('.ratingStars').innerHTML = generateStars(parseFloat(rating.ertekeles));
        item.querySelector('.ratingComment').textContent = rating.komment;
        container.appendChild(item);
    });
    countriesList.innerHTML = '';
    countriesList.appendChild(template);
}
function removeCountry(countryId)
{
    selectedCountries.delete(countryId);
    const countryPath = document.querySelector(`#terkep path[id="${countryId}"]`);
    if (countryPath)
    {
        countryPath.classList.remove('selected');
        if (countryId === 'tr')
        {
            countryPath.style.fill = '#E1E1E1';
        }
        else
        {
            countryPath.style.fill = '#C0C1C5';
        }
    }
    updateCountriesList();
}
function showReviewPopup(countryId, x, y)
{
    if (!isLoggedIn())
    {
        alert('Az értékeléshez be kell jelentkezned!');
        return;
    }
    const popup = document.getElementById('reviewPopup');
    const countryNameElement = document.getElementById('reviewCountryName');
    const textarea = document.getElementById('reviewTextarea');
    currentReviewCountry = countryId;
    currentRating = 0;
    const countryName = countryNames[countryId] || countryId.toUpperCase();
    countryNameElement.textContent = countryName;
    const existingStarRating = popup.querySelector('.starRatingContainer');
    if (existingStarRating)
    {
        existingStarRating.remove();
    }
    const template = document.getElementById('starRatingTemplate');
    const starRatingElement = template.content.cloneNode(true);
    countryNameElement.parentNode.insertBefore(starRatingElement, textarea);
    const stars = popup.querySelectorAll('.star');
    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            currentRating = index + 1;
            updateStarRating(currentRating);
        });
        star.addEventListener('mouseenter', () => {
            updateStarRating(index + 1);
        });
    });
    const starRating = popup.querySelector('.starRating');
    starRating.addEventListener('mouseleave', () => {
        updateStarRating(currentRating);
    });
    textarea.value = '';
    popup.style.left = Math.min(x + 10, window.innerWidth - 320) + 'px';
    popup.style.top = Math.min(y + 10, window.innerHeight - 250) + 'px';
    popup.style.display = 'block';
    setTimeout(() => textarea.focus(), 100);
}
function hideReviewPopup()
{
    const popup = document.getElementById('reviewPopup');
    popup.style.display = 'none';
    currentReviewCountry = null;
    currentRating = 0;
    const starRatingContainer = popup.querySelector('.starRatingContainer');
    if (starRatingContainer)
    {
        starRatingContainer.remove();
    }
}
async function saveReview()
{
    if (!currentReviewCountry) return;
    const textarea = document.getElementById('reviewTextarea');
    const reviewText = textarea.value.trim();
    if (currentRating === 0)
    {
        alert('Kérlek adj egy csillagos értékelést!');
        return;
    }
    if (!reviewText)
    {
        alert('Kérlek írj egy kommentet!');
        return;
    }
    const success = await saveRatingToJSON(currentReviewCountry, currentRating, reviewText);
    if (success)
    {
        hideReviewPopup();
        alert('Értékelés sikeresen elmentve!');
        showCountryRatings(currentReviewCountry);
    }
}
function parseRGB(rgbString)
{
    const match = rgbString.match(/\d+/g);
    if (!match || match.length < 3) return null;
    const [r, g, b] = match.map(Number);
    return { r, g, b };
}
function isNonEuropeanCountry(element)
{
    if (element.getAttribute('id') === 'tr')
    {
        return false;
    }
    const fillAttr = element.getAttribute('fill');
    const computedFill = window.getComputedStyle(element).fill;
    const colorsToCheck = [fillAttr, computedFill].filter(Boolean);
    for (const color of colorsToCheck)
    {
        const rgb = parseRGB(color);
        if (rgb)
        {
            if (rgb.r !== 192 || rgb.g !== 193 || rgb.b !== 197)
            {
                return true;
            }
        }
    }
    return false;
}
document.getElementById('saveBtn').addEventListener('click', async () =>
{
    if (!isLoggedIn()) return alert('Nem vagy bejelentkezve!');
    const countries = Array.from(selectedCountries);
    const response = await fetch('/api/save-colored',
    {
        method: 'POST',
        headers:
        {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ countries })
    });
    if (response.ok)
    {
        alert('Országok elmentve!');
    }
    else
    {
        alert('Hiba történt a mentés során!');
    }
});
document.getElementById('loadBtn').addEventListener('click', async () => {
    if (!isLoggedIn()) return alert('Nem vagy bejelentkezve!');
    const response = await fetch('/api/load-colored',
    {
        headers:
        {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    });
    const data = await response.json();
    if (Array.isArray(data))
    {
        selectedCountries.clear();
        data.forEach(id => selectedCountries.add(id));
        updateCountriesList();
        const svg = document.querySelectorAll('#terkep path');
        svg.forEach(path => {
            const id = path.id;
            if (selectedCountries.has(id))
                {
                    const els = document.querySelectorAll(`#terkep path[id="${id}"]`);
                    const el = els[els.length - 1];
                    if (el)
                    {
                        el.classList.add('selected');
                        el.style.fill = '#32AF4B';
                    }
                }
                else
                {
                    path.classList.remove('selected');
                    path.style.fill = '#C0C1C5';
                }
                    });
    }
});
async function loadMap()
{
    try {
        const ratingsLoaded = await loadRatings();
        const response = await fetch('terkep.svg');
        const svgText = await response.text();
        document.getElementById('terkep').innerHTML = svgText;
        const egg = document.createElement('div');
        egg.id = 'easterEgg';
        document.getElementById('terkep').appendChild(egg);
        const audio = new Audio('gyongyos.mp3');
        egg.addEventListener('click', () => {
            audio.play()
        });
        const svg = document.querySelector('#terkep svg');
        if (svg)
        {
            svg.removeAttribute('width');
            svg.removeAttribute('height');
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.maxWidth = 'none';
            svg.style.maxHeight = 'none';
            svg.style.display = 'block';
            const bbox = svg.getBBox();
            const cropPercentage = 0.55;
            const padding = 5;
            const viewBoxX = bbox.x - padding;
            const viewBoxY = bbox.y - padding;
            const viewBoxWidth = (bbox.width * cropPercentage) + padding;
            const viewBoxHeight = bbox.height + (padding * 2);
            svg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
            svg.setAttribute('preserveAspectRatio', 'xMinYMid meet');
            const textElements = svg.querySelectorAll('text, tspan');
            textElements.forEach(text => text.remove());
            const rectElements = svg.querySelectorAll('rect');
            rectElements.forEach(rect => {
                const fill = rect.getAttribute('fill');
                const width = parseFloat(rect.getAttribute('width') || '0');
                const height = parseFloat(rect.getAttribute('height') || '0');
                if ((fill === 'white' || fill === '#ffffff' || fill === 'none' || !fill) && (width > 100 || height > 100))
                {
                    rect.remove();
                }
            });
            const allElements = svg.querySelectorAll('*');
            allElements.forEach(element => {
                const fill = element.getAttribute('fill');
                const opacity = element.getAttribute('opacity');
                const visibility = element.getAttribute('visibility');
                if (visibility === 'hidden' || opacity === '0' || (fill === 'white' && element.tagName !== 'path') || fill === '#ffffff')
                {
                    element.remove();
                }
            });
            const paths = svg.querySelectorAll('path');
            paths.forEach((path, index) => {
                setTimeout(() => {
                    const isNonEuropean = isNonEuropeanCountry(path);
                    if (isNonEuropean)
                    {
                        path.classList.add('non-european');
                        path.style.cursor = 'not-allowed';
                        path.style.pointerEvents = 'auto';
                        path.addEventListener('mouseenter', function()
                        {
                            this.style.fill = 'rgb(225, 225, 225)';
                        });
                        path.addEventListener('mouseleave', function()
                        {
                            this.style.fill = 'rgb(225, 225, 225)';
                        });
                    }
                    else
                    {
                        path.addEventListener('click', handleCountryClick);
                        path.style.cursor = 'pointer';
                    }
                }, 100);
            });
            if (isRatingMode && ratingsLoaded)
            {
                applyRatingColors();
            }
        }
    }
    catch (error)
    {
        document.getElementById('terkep').innerHTML = "<p>A térképet nem lehetett betölteni.</p>";
    }
}
function handleCountryClick(event)
{
    const country = event.target;
    const rawId = country.getAttribute('id');
    const countryId = getCanonicalId(rawId);
    if (country.classList.contains('non-european')) return;
    if (isRatingMode)
    {
        const rect = country.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        showCountryRatings(countryId);
        showReviewPopup(countryId, x, y);
    }
    else
    {
        const paths = [countryId, ...(inverseAliasMap[countryId] || [])];
        if (selectedCountries.has(countryId))
        {
            paths.forEach(id => {
                selectedCountries.delete(id);
                const els = document.querySelectorAll(`#terkep path[id="${id}"]`);
                const el = els[els.length - 1];
                if (el)
                {
                    el.classList.remove('selected');
                    el.style.fill = id === 'tr' ? '#E1E1E1' : '#C0C1C5';
                }
            });
        }
        else
        {
            paths.forEach(id => {
                selectedCountries.add(id);
                const els = document.querySelectorAll(`#terkep path[id="${id}"]`);
                const el = els[els.length - 1];
                if (el) {
                    el.classList.add('selected');
                    el.style.fill = '#32AF4B';
                }
            });
        }
        updateCountriesList();
    }
}
function updateModeTitle()
{
    const modeTitle = document.getElementById('modeTitle');
    const countriesPanelTitle = document.getElementById('countriesPanelTitle');
    if (isRatingMode)
    {
        modeTitle.textContent = 'Értékelős mód - Adj értékelést az országoknak!';
        countriesPanelTitle.textContent = 'Értékelések';
        document.getElementById('loadBtn').style.display = 'none';
        document.getElementById('saveBtn').style.display = 'none';
    }
    else
    {
        modeTitle.textContent = 'Színezős mód - Mutasd meg hol jártál!';
        countriesPanelTitle.textContent = 'Kijelölt országok';
        document.getElementById('loadBtn').style.display = 'block';
        document.getElementById('saveBtn').style.display = 'block';
    }
}
document.getElementById('toggleButton').addEventListener('click', function()
{
    const toggleButton = this;
    if (!isRatingMode)
    {
        toggleButton.classList.add('active');
        isRatingMode = true;
        deselectAllCountries();
        applyRatingColors();
        
    }
    else
    {
        toggleButton.classList.remove('active');
        isRatingMode = false;
        clearAllReviews();
        resetRatingColors();
    }
    updateModeTitle();
    updateCountriesList();
});
document.getElementById('saveReviewBtn').addEventListener('click', saveReview);
document.getElementById('cancelReviewBtn').addEventListener('click', hideReviewPopup);
document.addEventListener('click', function(event)
{
    const popup = document.getElementById('reviewPopup');
    const popupContent = document.querySelector('.reviewPopupContent');
    if (popup.style.display === 'block' && !popupContent.contains(event.target) && !event.target.closest('#terkep path'))
    {
        hideReviewPopup();
    }
});
async function handleAuth(type)
{
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!username || !password)
    {
        alert('Felhasználónév és jelszó kötelező.');
        return;
    }
    let result
    if (type === 'login')
    {
        result = await loginUser(username, password);
    }
    else
    {
        result = await signupUser(username, password);
    }
    alert(result.message);
    if (result.success)
    {
        document.querySelector('.loginPanel').style.display = 'none';
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    }
}
document.getElementById('loginBtn').addEventListener('click', e => {
    e.preventDefault();
    handleAuth('login');
});
document.getElementById('signupBtn').addEventListener('click', e => {
    e.preventDefault();
    handleAuth('signup');
});
document.getElementById('loginForm').addEventListener('keydown', async (e) => {
    if (e.key === 'Enter')
    {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        if (!username || !password) return;
        const loginResult = await loginUser(username, password);
        if (loginResult.success)
        {
            alert(loginResult.message);
            document.querySelector('.loginPanel').style.display = 'none';
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
            return;
        }
        const signupResult = await signupUser(username, password);
        alert(signupResult.message);
        if (signupResult.success)
        {
            document.querySelector('.loginPanel').style.display = 'none';
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
        }
    }
});
window.addEventListener('DOMContentLoaded', async () => {
    await loadCountryNames();
    loadMap();
    updateModeTitle();
    const token = getAuthToken();
    if (token)
    {
        try
        {
            const response = await fetch('/api/user',
            {
                headers:
                {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok)
            {
                authToken = token;
                currentUser = { username: data.username };
                updateUIForLoggedInUser();
            }
            else
            {
                removeAuthToken();
            }
        }
        catch
        {
            removeAuthToken();
        }
    }
});
let inactivityTimer;
const inactive = 5 * 60 * 1000;
function resetInactivityTimer()
{
    clearTimeout(inactivityTimer);
    if (isLoggedIn())
    {
        inactivityTimer = setTimeout(() => {
            alert('Kijelentkeztettük inaktivitás miatt!');
            logoutUser();
        }, inactive);
    }
}
['click', 'mousemove', 'keydown', 'scroll'].forEach(event =>
    document.addEventListener(event, resetInactivityTimer)
);
resetInactivityTimer();