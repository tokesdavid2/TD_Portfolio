const bodyParser = require('body-parser');
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = 3000;
const JWT_SECRET = 'er2gy9in5or1or2pa1pa9sc9se0st8sz1te2us1';
const SALT_ROUNDS = 10;
const USERS_FILE = 'users.json';
const RATINGS_FILE = 'ertekeles.json';
const COLORED_FILE = 'szinezett.json';
const COUNTRY_FILE = 'orszagok.json';
app.set('view engine', 'ejs');
app.set('views', __dirname);
app.use(cors());
app.use(bodyParser.json());
async function readUsers()
{
    try
    {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        return JSON.parse(data);
    }
    catch (error)
    {
        return [];
    }
}
async function writeUsers(users)
{
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}
async function readRatings()
{
    try
    {
        const data = await fs.readFile(RATINGS_FILE, 'utf8');
        return JSON.parse(data);
    }
    catch (error)
    {
        return [];
    }
}
async function writeRatings(ratings)
{
    await fs.writeFile(RATINGS_FILE, JSON.stringify(ratings, null, 2));
}
async function readColored()
{
    try
    {
        const data = await fs.readFile(COLORED_FILE, 'utf8');
        return JSON.parse(data);
    }
    catch (error)
    {
        return [];
    }
}
async function writeColored(data)
{
    await fs.writeFile(COLORED_FILE, JSON.stringify(data, null, 2));
}
async function findUserByUsername(username)
{
    const users = await readUsers();
    return users.find(user => user.username === username);
}
async function readCountryNames()
{
  const jsonText = await fs.readFile(COUNTRY_FILE, 'utf8');
  return JSON.parse(jsonText);
}
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token)
    {
        return res.status(401).json(
            {
                error: 'Hozzáférési kulcs szükséges!'
            });
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err)
        {
            return res.status(403).json(
                {
                    error: 'Érvénytelen vagy lejárt kulcs!'
                });
        }
        req.user = user;
        next();
    });
};
app.post('/api/signup', async (req, res) => {
    try
    {
        const { username, password } = req.body;
        if (!username || !password)
        {
            return res.status(400).json(
                {
                    error: 'Minden mező kitöltése kötelező!'
                });
        }
        const users = await readUsers();
        const existingUser = users.find(user => user.username === username);
        if (existingUser)
        {
            return res.status(400).json(
                {
                    error: 'A felhasználónév már foglalt!'
                });
        }
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const newUser =
        {
            username: username,
            password: hashedPassword,
        };
        users.push(newUser);
        await writeUsers(users);
        const token = jwt.sign(
            {
                username: username
            },
            JWT_SECRET,
            {
                expiresIn: '24h'
            }
        );
        res.json(
        {
            success: true,
            message: 'Sikeres regisztráció!',
            token: token,
            user:
            {
                username: username
            }
        });
    }
    catch (error)
    {
        console.error('Regisztrációs hiba:', error);
        res.status(500).json(
            {
                error: 'Szerver hiba a regisztráció során!'
            });
    }
});
app.post('/api/login', async (req, res) => {
    try
    {
        const { username, password } = req.body;

        if (!username || !password)
        {
            return res.status(400).json(
                {
                    error: 'Felhasználónév és jelszó szükséges!'
                });
        }
        const user = await findUserByUsername(username);
        if (!user)
        {
            return res.status(401).json(
                {
                    error: 'Hibás felhasználónév vagy jelszó. Regisztrálj, ha még nincs fiókod!'
                });
        }
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword)
        {
            return res.status(401).json(
                {
                    error: 'Hibás felhasználónév vagy jelszó. Regisztrálj, ha még nincs fiókod!'
                });
        }
        const token = jwt.sign(
            {
                username: user.username
            },
            JWT_SECRET,
            {
                expiresIn: '24h'
            }
        );
        res.json({
            success: true,
            message: 'Sikeres bejelentkezés!',
            token: token,
            user:
            {
                username: user.username
            }
        });
    }
    catch (error)
    {
        console.error('Bejelentkezési hiba:', error);
        res.status(500).json(
            {
                error: 'Szerver hiba a bejelentkezés során!'
            });
    }
});
app.use(express.static('.'));
app.get('/api/user', authenticateToken, async (req, res) => {
    try
    {
        const user = await findUserByUsername(req.user.username);
        if (!user)
        {
            return res.status(404).json(
            {
                error: 'Felhasználó nem található!'
            });
        }
        res.json(
        {
            username: user.username,
        });
    }
    catch (error)
    {
        res.status(500).json(
            {
                error: 'Szerver hiba!'
            });
    }
});
app.get('/api/countries', async (req, res) => {
    try
    {
        const countryMap = await readCountryNames();
        res.json(countryMap);
    }
    catch (error)
    {
        res.status(500).json(
            {
                error: 'Nem sikerült betölteni az országneveket!'
            });
    }
});
app.get('/api/ratings', async (req, res) => {
    try
    {
        const ratings = await readRatings();
        res.json(ratings);
    }
    catch (error)
    {
        res.status(500).json(
            {
                error: 'Hiba az értékelések betöltése során!'
            });
    }
});
app.post('/api/save-rating', authenticateToken, async (req, res) => {
    try
    {
        const { ID, ertekeles, komment } = req.body;
        if (!ID || !ertekeles || !komment)
        {
            return res.status(400).json(
                {
                    error: 'Minden mező kitöltése kötelező!'
                });
        }
        const ratings = await readRatings();
        const existing = ratings.find(r =>
        String(r.ID).toLowerCase() === String(ID).toLowerCase() && String(r.username).toLowerCase() === String(req.user.username).toLowerCase()
        );
        if (existing)
        {
        return res.status(400).json(
            {
                error: 'Már értékelted ezt az országot!'
            });
        }
        const newRating =
        {
            ID: ID,
            username: req.user.username,
            ertekeles: Number(ertekeles),
            komment: komment
        };
        ratings.push(newRating);
        await writeRatings(ratings);
        res.json(
        {
            success: true,
            message: 'Értékelés sikeresen elmentve!',
        });
    }
    catch (error)
    {
        console.error('Hiba az értékelés mentése során:', error);
        res.status(500).json(
            {
                error: 'Hiba az értékelés mentése során!'
            });
    }
});
app.post('/api/save-colored', authenticateToken, async (req, res) => {
    try
    {
        const { countries } = req.body;
        if (!Array.isArray(countries))
        {
            return res.status(400).json(
            {
                error: 'Érvénytelen formátum!'
            });
        }
        const all = await readColored();
        const filtered = all.filter(entry => entry.username !== req.user.username);
        filtered.push(
            {
                username: req.user.username, countries
            });
        await writeColored(filtered);
        res.json(
        {
            success: true
        });
    }
    catch (err)
    {
        console.error('Szerverhiba a szín mentése során:', err);
        res.status(500).json(
            {
                error: 'Szerverhiba a szín mentése során!'
            });
    }
});
app.get('/api/load-colored', authenticateToken, async (req, res) => {
    const all = await readColored();
    const userData = all.find(entry => entry.username === req.user.username);
    if (userData)
    {
        res.json(userData.countries);
    }
    else
    {
        res.json([]);
    }
});
app.get('/EJS/orszagLista', async (req, res) => {
    const ids = req.query.ids?.split(',') || [];
    const countryNames = await readCountryNames();
    res.render('orszagLista',
    {
        selectedCountries: ids,
        countryNames
    });
});
app.listen(PORT, () => {
    console.log(`Szerver elindult a ${PORT}-as porton!`);
});
process.on('exit', (code) => {
    console.log(`A szerver leállt az alábbi kilépési kóddal: ${code}`);
});