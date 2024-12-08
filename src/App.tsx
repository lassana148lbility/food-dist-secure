import React, { useState } from 'react';
import axios from 'axios';

interface DonationForm {
  foodItem: string;
  quantity: string;
  pantryId: string;
  type: string;
  restaurantId: string;
}

interface User {
  id: number;
  name: string;
  role: string;
}

interface Restaurant {
  ID: number;
  Restaurant: string;
  Cuisine: string;
  Contact: string;
  Address: string;
}

interface Donation {
  Donation_ID: number;
  Food_Item: string;
  Source: string;
  Quantity: number;
  Status: string;
}

interface Pantry {
  Pantry_Name: string;
  Address: string;
  Contact_Info: string;
  Hours: string;
  Capacity: number;
  Total_Donations: number;
}

interface LogisticsItem {
  Source: string;
  Food_Item: string;
  Original_Quantity: number;
  Donated_Quantity: number;
  Destination_Pantry: string;
  Status: string;
}

function App() {
  const [role, setRole] = useState('');
  const [showLogin, setShowLogin] = useState(true);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [showDonationForm, setShowDonationForm] = useState(false);
  const [donationForm, setDonationForm] = useState<DonationForm>({
    foodItem: '',
    quantity: '',
    pantryId: '',
    type: '',
    restaurantId: ''
  });

  const fetchData = async (selectedRole: string) => {
    if (!selectedRole) return;
    
    setLoading(true);
    setError('');
    try {
      let endpoint = '';
      switch (selectedRole.toLowerCase()) {
        case 'head chef':
          endpoint = 'https://food-dist-secure-4.onrender.com/api/chef/restaurants';
          break;
        case 'pantry manager':
          endpoint = 'https://food-dist-secure-4.onrender.com/api/pantry/donations';
          break;
        case 'ngo manager':
          endpoint = 'https://food-dist-secure-4.onrender.com/api/ngo/pantries';
          break;
        case 'logistics coordinator':
          endpoint = 'https://food-dist-secure-4.onrender.com/api/logistics/overview';
          break;
        default:
          setError('Invalid role selected');
          setLoading(false);
          return;
      }
      const response = await axios.get(endpoint);
      setData(response.data);
    } catch (err) {
      setError('Failed to fetch data. Please try again.');
      console.error('Fetch error:', err);
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const usernameInput = form.elements.namedItem('username') as HTMLInputElement;
    const roleSelect = form.elements.namedItem('role') as HTMLSelectElement;
    
    setLoginError('');
    
    try {
      const response = await axios.post('https://food-dist-secure-4.onrender.com/api/login', {
        username: usernameInput.value,
        role: roleSelect.value
      });

      if (response.data.success) {
        const userRole = response.data.user.role;
        setUser(response.data.user);
        setRole(userRole);
        setShowLogin(false);
        fetchData(userRole);
      }
    } catch (err) {
      setLoginError('Invalid credentials. Please try again.');
      console.error('Login error:', err);
    }
  };

  const handleCreateDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (!donationForm.restaurantId) {
        throw new Error('Restaurant ID is required');
      }
      
      const currentDate = new Date().toISOString().split('T')[0];
      await axios.post('https://food-dist-secure-4.onrender.com/api/donation/create', {
        ...donationForm,
        donationDate: currentDate
      });
      setShowDonationForm(false);
      fetchData(role);
      alert('Donation created successfully!');
    } catch (err) {
      console.error('Error creating donation:', err);
      setError('Failed to create donation. Please try again.');
    }
  };

  const handleUpdateStatus = async (donationId: number, newStatus: string) => {
    if (!donationId) return;
    
    setError('');
    try {
      await axios.post('https://food-dist-secure-4.onrender.com/api/donation/update-status', {
        donationId,
        status: newStatus
      });
      fetchData(role);
      alert('Status updated successfully!');
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status. Please try again.');
    }
  };

  const LoginForm = () => (
    <div className="login-form-container">
      <div className="login-form">
        <h2>Login</h2>
        {loginError && <div className="error-message">{loginError}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              name="username"
              required
              placeholder="Enter your username"
            />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select name="role" required>
              <option value="">Select Role</option>
              <option value="Head Chef">Head Chef</option>
              <option value="Pantry Manager">Pantry Manager</option>
              <option value="NGO Manager">NGO Manager</option>
              <option value="Logistics Coordinator">Logistics Coordinator</option>
            </select>
          </div>
          <button type="submit" className="login-button">Login</button>
        </form>
      </div>
    </div>
  );

  const DonationForm = () => (
    <div className="donation-form-overlay">
      <div className="donation-form">
        <h2>Create New Donation</h2>
        <form onSubmit={handleCreateDonation}>
          <div className="form-group">
            <label>Food Item</label>
            <input
              type="text"
              value={donationForm.foodItem}
              onChange={e => setDonationForm({...donationForm, foodItem: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select
              value={donationForm.type}
              onChange={e => setDonationForm({...donationForm, type: e.target.value})}
              required
            >
              <option value="">Select type</option>
              <option value="Perishable">Perishable</option>
              <option value="Non-Perishable">Non-Perishable</option>
              <option value="Prepared">Prepared Food</option>
            </select>
          </div>
          <div className="form-group">
            <label>Quantity</label>
            <input
              type="number"
              value={donationForm.quantity}
              onChange={e => setDonationForm({...donationForm, quantity: e.target.value})}
              required
              min="1"
            />
          </div>
          <div className="form-group">
            <label>Select Pantry</label>
            <select
              value={donationForm.pantryId}
              onChange={e => setDonationForm({...donationForm, pantryId: e.target.value})}
              required
            >
              <option value="">Select a pantry</option>
              <option value="1">St. Christine Christian Services</option>
              <option value="2">New Bethel Baptist Church</option>
              <option value="3">Gleaners Community Food Bank</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="submit" className="submit-button">Create Donation</button>
            <button 
              type="button" 
              className="cancel-button"
              onClick={() => setShowDonationForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderData = () => {
    if (!data) return null;

    switch (role.toLowerCase()) {
      case 'head chef':
        return (
          <div className="data-cards">
            {Array.isArray(data) && data.map((restaurant: Restaurant, index: number) => (
              <div key={index} className="card">
                <h3>{restaurant.Restaurant}</h3>
                <p><strong>Cuisine:</strong> {restaurant.Cuisine}</p>
                <p><strong>Contact:</strong> {restaurant.Contact}</p>
                <p><strong>Address:</strong> {restaurant.Address}</p>
                <button 
                  className="action-button"
                  onClick={() => {
                    setDonationForm({
                      ...donationForm, 
                      restaurantId: restaurant.ID.toString()
                    });
                    setShowDonationForm(true);
                  }}
                >
                  Create New Donation
                </button>
              </div>
            ))}
          </div>
        );

      case 'pantry manager':
        return (
          <div className="data-cards">
            {Array.isArray(data) && data.map((donation: Donation, index: number) => (
              <div key={index} className="card">
                <h3>Donation #{donation.Donation_ID}</h3>
                <p><strong>Food Item:</strong> {donation.Food_Item}</p>
                <p><strong>Source:</strong> {donation.Source}</p>
                <p><strong>Quantity:</strong> {donation.Quantity}</p>
                <p><strong>Status:</strong> 
                  <span className={`status ${donation.Status.toLowerCase()}`}>
                    {donation.Status}
                  </span>
                </p>
                {donation.Status !== 'Completed' && (
                  <div className="card-actions">
                    <button 
                      className="action-button"
                      onClick={() => handleUpdateStatus(donation.Donation_ID, 'Completed')}
                    >
                      Mark as Completed
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case 'ngo manager':
        return (
          <div className="data-cards">
            {Array.isArray(data) && data.map((pantry: Pantry, index: number) => (
              <div key={index} className="card">
                <h3>{pantry.Pantry_Name}</h3>
                <p><strong>Address:</strong> {pantry.Address}</p>
                <p><strong>Contact:</strong> {pantry.Contact_Info}</p>
                <p><strong>Hours:</strong> {pantry.Hours}</p>
                <p><strong>Capacity:</strong> {pantry.Capacity}</p>
                <p><strong>Total Donations:</strong> {pantry.Total_Donations}</p>
              </div>
            ))}
          </div>
        );

      case 'logistics coordinator':
        return (
          <div className="data-cards">
            {Array.isArray(data) && data.map((item: LogisticsItem, index: number) => (
              <div key={index} className="card">
                <h3>{item.Source}</h3>
                <p><strong>Food Item:</strong> {item.Food_Item}</p>
                <p><strong>Original Quantity:</strong> {item.Original_Quantity}</p>
                <p><strong>Donated Quantity:</strong> {item.Donated_Quantity}</p>
                <p><strong>Destination:</strong> {item.Destination_Pantry}</p>
                <p><strong>Status:</strong> 
                  <span className={`status ${item.Status.toLowerCase()}`}>
                    {item.Status}
                  </span>
                </p>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  const LandingPage = () => (
    <div className="landing-page">
      <div className="hero-section">
        <h1>Fighting Food Waste Together</h1>
        <p>Connecting restaurants with food pantries to help our community</p>
      </div>
      <LoginForm />
      <div className="impact-section">
        <h2>Our Impact</h2>
        <div className="stats">
          <div className="stat">
            <h3>3</h3>
            <p>Restaurants</p>
          </div>
          <div className="stat">
            <h3>3</h3>
            <p>Food Pantries</p>
          </div>
          <div className="stat">
            <h3>9</h3>
            <p>Donations</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app">
      {showLogin ? (
        <LandingPage />
      ) : (
        <>
          <header>
            <h1>Food Distribution System</h1>
            <div className="header-controls">
              <span className="role-label">Current Role: {user?.name} ({role})</span>
              <button 
                className="action-button" 
                onClick={() => {
                  setShowLogin(true);
                  setUser(null);
                  setRole('');
                }}
              >
                Logout
              </button>
            </div>
          </header>
          <main>
            {loading ? (
              <div className="loading">Loading...</div>
            ) : error ? (
              <div className="error">{error}</div>
            ) : (
              <>
                {renderData()}
                {showDonationForm && <DonationForm />}
              </>
            )}
          </main>
        </>
      )}
    </div>
  );
}

export default App;