import React, { useState, useEffect } from 'react';

const EditItemForm = ({ initialData, onEditItem, loading, companies, packs }) => {
  const [formData, setFormData] = useState({
    itemCode: '',
    name: '',
    description: '',
    pack: '',
    market: 'local',
    bottlesPerCase: '',
    brand: '',
    company: '',
    isActive: true
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        itemCode: initialData.itemCode || '',
        name: initialData.name || '',
        description: initialData.description || '',
        pack: initialData.pack?._id || initialData.pack || '',
        market: initialData.market || 'local',
        bottlesPerCase: initialData.bottlesPerCase || '',
        brand: initialData.brand || '',
        company: initialData.company?._id || initialData.company || '',
        isActive: initialData.isActive !== false
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    if (name === 'pack') {
        const selectedPack = packs.find(p => p._id === value);
        if (selectedPack) {
            setFormData(prev => ({ ...prev, bottlesPerCase: selectedPack.bottlesPerCase }));
        }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onEditItem(initialData._id, formData);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Item Code</label>
          <input
            type="text"
            name="itemCode"
            value={formData.itemCode}
            onChange={handleChange}
            className="w-full bg-transparent border border-gray-300 px-3 py-2 rounded outline-none focus:border-primary"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full bg-transparent border border-gray-300 px-3 py-2 rounded outline-none focus:border-primary"
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          className="w-full bg-transparent border border-gray-300 px-3 py-2 rounded outline-none focus:border-primary"
        ></textarea>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Company</label>
          <select
            name="company"
            value={formData.company}
            onChange={handleChange}
            className="w-full bg-transparent border border-gray-300 px-3 py-2 rounded outline-none focus:border-primary"
            required
          >
            <option value="">Select Company</option>
            {companies.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Brand</label>
          <input
            type="text"
            name="brand"
            value={formData.brand}
            onChange={handleChange}
            className="w-full bg-transparent border border-gray-300 px-3 py-2 rounded outline-none focus:border-primary"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Market</label>
          <select
            name="market"
            value={formData.market}
            onChange={handleChange}
            className="w-full bg-transparent border border-gray-300 px-3 py-2 rounded outline-none focus:border-primary capitalize"
            required
          >
            <option value="local">Local</option>
            <option value="export">Export</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Pack</label>
          <select
            name="pack"
            value={formData.pack}
            onChange={handleChange}
            className="w-full bg-transparent border border-gray-300 px-3 py-2 rounded outline-none focus:border-primary"
            required
          >
            <option value="">Select Pack</option>
            {packs.map(p => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Bottles Per Case</label>
          <input
            type="number"
            name="bottlesPerCase"
            value={formData.bottlesPerCase}
            onChange={handleChange}
            className="w-full bg-transparent border border-gray-300 px-3 py-2 rounded outline-none focus:border-primary"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Status</label>
          <div className="flex items-center gap-3 h-[42px]">
            <button
              type="button"
              role="switch"
              aria-checked={formData.isActive}
              onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                formData.isActive ? 'bg-emerald-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  formData.isActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${formData.isActive ? 'text-emerald-600' : 'text-gray-500'}`}>
              {formData.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>
      <button type="submit" className="w-full bg-primary text-white py-2 rounded mt-2 hover:bg-primary-dark transition-colors" disabled={loading}>
        {loading ? 'Updating...' : 'Update Item'}
      </button>
    </form>
  );
};

export default EditItemForm;
