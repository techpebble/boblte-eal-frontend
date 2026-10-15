import React, { useState } from 'react';

const AddDeliveryForm = ({ onAddDelivery, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddDelivery(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm text-gray-600 mb-1">Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="w-full bg-transparent border border-gray-300 px-3 py-2 rounded outline-none focus:border-primary"
          placeholder="e.g. Central Depot"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">Code</label>
        <input
          type="text"
          name="code"
          value={formData.code}
          onChange={handleChange}
          className="w-full bg-transparent border border-gray-300 px-3 py-2 rounded outline-none focus:border-primary"
          placeholder="e.g. DPT-01"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">Address</label>
        <textarea
          name="address"
          value={formData.address}
          onChange={handleChange}
          className="w-full bg-transparent border border-gray-300 px-3 py-2 rounded outline-none focus:border-primary"
          placeholder="e.g. 123 Main St"
          required
        ></textarea>
      </div>
      <button type="submit" className="w-full bg-primary text-white py-2 rounded mt-2 hover:bg-primary-dark transition-colors" disabled={loading}>
        {loading ? 'Adding...' : 'Add Depot'}
      </button>
    </form>
  );
};

export default AddDeliveryForm;
