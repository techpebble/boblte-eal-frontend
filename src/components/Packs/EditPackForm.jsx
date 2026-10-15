import React, { useState, useEffect } from 'react';

const EditPackForm = ({ initialData, onEditPack, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    bottlesPerCase: '',
    pack: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        bottlesPerCase: initialData.bottlesPerCase || '',
        pack: initialData.pack || '',
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onEditPack(initialData._id, formData);
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
          placeholder="e.g. 750ml Bottle"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">Bottles Per Case</label>
        <input
          type="number"
          name="bottlesPerCase"
          value={formData.bottlesPerCase}
          onChange={handleChange}
          className="w-full bg-transparent border border-gray-300 px-3 py-2 rounded outline-none focus:border-primary"
          placeholder="e.g. 12"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">Pack Size (ml)</label>
        <input
          type="number"
          name="pack"
          value={formData.pack}
          onChange={handleChange}
          className="w-full bg-transparent border border-gray-300 px-3 py-2 rounded outline-none focus:border-primary"
          placeholder="e.g. 750"
          required
        />
      </div>
      <button type="submit" className="w-full bg-primary text-white py-2 rounded mt-2 hover:bg-primary-dark transition-colors" disabled={loading}>
        {loading ? 'Updating...' : 'Update Pack'}
      </button>
    </form>
  );
};

export default EditPackForm;
