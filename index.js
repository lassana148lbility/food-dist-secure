// server/index.js
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database configuration
const dbConfig = {
    host: 'localhost',
    user: 'Las-coding',
    password: 'Naru2',
    database: 'Food_Distribution_DB',
    port: 3306
};

const db = mysql.createConnection(dbConfig);

db.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

// User role endpoints
app.get('/api/chef/restaurants', (req, res) => {
    const query = `
        SELECT r.ID, r.Restaurant, r.Cuisine, r.Contact, r.Address,
               (SELECT COUNT(*) FROM Food_Item fi 
                JOIN Donation d ON fi.Food_Item_ID = d.Food_Item_ID 
                WHERE fi.Restaurant_ID = r.ID) as Total_Donations
        FROM Restaurant r
        JOIN USER u ON r.UserID = u.UserID
        WHERE u.Role = 'Head Chef'
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Restaurant query error:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log('Restaurant query results:', results);
        res.json(results);
    });
});

// Pantry Manager endpoints
app.get('/api/pantry/donations', (req, res) => {
    console.log('Fetching pantry donations');
    const query = `
        SELECT d.Donation_ID, f.Name as Food_Item, r.Restaurant as Source,
               DATE_FORMAT(d.Donation_Date, '%Y-%m-%d') as Donation_Date, 
               d.Quantity, d.Status
        FROM Donation d
        JOIN Food_Item f ON d.Food_Item_ID = f.Food_Item_ID
        JOIN Restaurant r ON f.Restaurant_ID = r.ID
        JOIN Food_Pantry fp ON d.Pantry_ID = fp.PantryID
        ORDER BY 
            CASE WHEN d.Status = 'Pending' THEN 0 ELSE 1 END,
            d.Donation_Date DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Pantry query error:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log('Pantry donations found:', results.length);
        res.json(results);
    });
});

// NGO Manager endpoints
app.get('/api/ngo/pantries', (req, res) => {
    console.log('Fetching NGO pantries');
    const query = `
        SELECT 
            fp.Name as Pantry_Name, 
            fp.Address, 
            fp.Contact_Info,
            fp.Hours, 
            fp.Capacity,
            COUNT(d.Donation_ID) as Total_Donations,
            COUNT(CASE WHEN d.Status = 'Pending' THEN 1 END) as Pending_Donations,
            COUNT(CASE WHEN d.Status = 'Completed' THEN 1 END) as Completed_Donations
        FROM Food_Pantry fp
        LEFT JOIN Donation d ON fp.PantryID = d.Pantry_ID
        GROUP BY fp.PantryID, fp.Name, fp.Address, fp.Contact_Info, fp.Hours, fp.Capacity
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('NGO query error:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log('NGO pantries found:', results.length);
        res.json(results);
    });
});

// Logistics Coordinator endpoints
app.get('/api/logistics/overview', (req, res) => {
    console.log('Fetching logistics overview');
    const query = `
        SELECT 
            r.Restaurant as Source, 
            f.Name as Food_Item,
            f.Type,
            f.Quantity as Original_Quantity, 
            d.Quantity as Donated_Quantity,
            fp.Name as Destination_Pantry, 
            d.Status,
            DATE_FORMAT(d.Donation_Date, '%Y-%m-%d') as Donation_Date
        FROM Donation d
        JOIN Food_Item f ON d.Food_Item_ID = f.Food_Item_ID
        JOIN Restaurant r ON f.Restaurant_ID = r.ID
        JOIN Food_Pantry fp ON d.Pantry_ID = fp.PantryID
        ORDER BY d.Donation_Date DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Logistics query error:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log('Logistics records found:', results.length);
        res.json(results);
    });
});

// Create new donation endpoint
app.post('/api/donation/create', async (req, res) => {
    console.log('Creating new donation with data:', req.body);
    const { foodItem, quantity, type, restaurantId, pantryId } = req.body;
    
    if (!foodItem || !quantity || !type || !restaurantId || !pantryId) {
        console.error('Missing required fields:', { foodItem, quantity, type, restaurantId, pantryId });
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        await db.promise().beginTransaction();
        console.log('Transaction started');

        // Create food item
        const [foodItemResult] = await db.promise().query(
            'INSERT INTO Food_Item (Restaurant_ID, Name, Quantity, Type, `Condition`) VALUES (?, ?, ?, ?, ?)',
            [restaurantId, foodItem, quantity, type, 'Fresh']
        );
        console.log('Food item created:', foodItemResult);

        // Create donation
        const [donationResult] = await db.promise().query(
            'INSERT INTO Donation (Food_Item_ID, Pantry_ID, Donation_Date, Quantity, Status) VALUES (?, ?, NOW(), ?, ?)',
            [foodItemResult.insertId, pantryId, quantity, 'Pending']
        );
        console.log('Donation created:', donationResult);

        await db.promise().commit();
        console.log('Transaction committed');

        // Verify the created donation
        const [verifyDonation] = await db.promise().query(`
            SELECT 
                d.Donation_ID,
                f.Name as Food_Item,
                r.Restaurant as Source,
                fp.Name as Destination_Pantry,
                d.Quantity,
                d.Status,
                DATE_FORMAT(d.Donation_Date, '%Y-%m-%d') as Donation_Date
            FROM Donation d
            JOIN Food_Item f ON d.Food_Item_ID = f.Food_Item_ID
            JOIN Restaurant r ON f.Restaurant_ID = r.ID
            JOIN Food_Pantry fp ON d.Pantry_ID = fp.PantryID
            WHERE d.Donation_ID = ?
        `, [donationResult.insertId]);
        
        console.log('Verified donation:', verifyDonation[0]);

        res.json({ 
            message: 'Donation created successfully',
            donation: verifyDonation[0]
        });
    } catch (err) {
        await db.promise().rollback();
        console.error('Error creating donation:', err);
        res.status(500).json({ 
            error: 'Failed to create donation',
            details: err.message 
        });
    }
});

// Update donation status endpoint
app.post('/api/donation/update-status', async (req, res) => {
    console.log('Updating donation status:', req.body);
    const { donationId, status } = req.body;
    
    if (!donationId || !status) {
        console.error('Missing required fields:', { donationId, status });
        return res.status(400).json({ error: 'Missing donationId or status' });
    }

    try {
        const [result] = await db.promise().query(
            'UPDATE Donation SET Status = ? WHERE Donation_ID = ?',
            [status, donationId]
        );
        console.log('Update result:', result);

        if (result.affectedRows === 0) {
            console.error('Donation not found:', donationId);
            return res.status(404).json({ error: 'Donation not found' });
        }

        res.json({ message: 'Status updated successfully' });
    } catch (err) {
        console.error('Error updating status:', err);
        res.status(500).json({ 
            error: 'Failed to update status',
            details: err.message 
        });
    }
});

// Get available pantries endpoint
app.get('/api/pantries', (req, res) => {
    console.log('Fetching available pantries');
    const query = `
        SELECT 
            fp.PantryID, 
            fp.Name,
            fp.Capacity,
            COUNT(d.Donation_ID) as Current_Donations
        FROM Food_Pantry fp
        LEFT JOIN Donation d ON fp.PantryID = d.Pantry_ID AND d.Status = 'Pending'
        GROUP BY fp.PantryID, fp.Name, fp.Capacity
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Pantries query error:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log('Pantries found:', results.length);
        res.json(results);
    });
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { username, role } = req.body;
    console.log('Login attempt:', { username, role });

    // Define valid users for testing
    const validUsers = [
        { UserID: '001', Name: 'Aaron Hewins', Role: 'Head Chef' },
        { UserID: '002', Name: 'Lassana Bility', Role: 'Pantry Manager' },
        { UserID: '003', Name: 'Camellia Pramanick', Role: 'NGO Manager' },
        { UserID: '004', Name: 'Adila Choudhury', Role: 'Logistics Coordinator' }
    ];

    // Find matching user
    const user = validUsers.find(u => 
        u.Name.toLowerCase() === username.toLowerCase() && 
        u.Role.toLowerCase() === role.toLowerCase()
    );

    if (user) {
        console.log('Login successful:', user);
        res.json({
            success: true,
            user: {
                id: user.UserID,
                name: user.Name,
                role: user.Role
            }
        });
    } else {
        console.log('Login failed: Invalid credentials');
        res.status(401).json({ 
            success: false, 
            error: 'Invalid credentials' 
        });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});