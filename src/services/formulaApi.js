const API_URL = process.env.REACT_APP_API_URL || 'https://o43p0ff7m7.execute-api.ap-southeast-2.amazonaws.com/prod';

const formulaApi = {
  // Get all formulas
  async getAll() {
    try {
      const response = await fetch(`${API_URL}/team-workspaces/formula`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching formulas:', error);
      throw error;
    }
  },

  // Get a single formula by ID
  async getById(id) {
    try {
      const response = await fetch(`${API_URL}/team-workspaces/formula/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching formula:', error);
      throw error;
    }
  },

  // Create a new formula
  async create(formulaData) {
    try {
      const response = await fetch(`${API_URL}/team-workspaces/formula`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formulaData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating formula:', error);
      throw error;
    }
  },

  // Update an existing formula
  async update(id, formulaData) {
    try {
      const response = await fetch(`${API_URL}/team-workspaces/formula/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formulaData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating formula:', error);
      throw error;
    }
  },

  // Delete a formula
  async delete(id) {
    try {
      const response = await fetch(`${API_URL}/team-workspaces/formula/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error deleting formula:', error);
      throw error;
    }
  },
};

export default formulaApi;



