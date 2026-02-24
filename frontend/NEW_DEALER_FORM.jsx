  // NEW DEALER FORM - Complete replacement for lines 717-850

{/* Basic Information Section */ }
<div className="space-y-4">
  <h3 className={`text-sm font-bold uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Basic Information</h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Reference No */}
    <div className="space-y-1.5">
      <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Reference No.*</label>
      <div className="relative">
        <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="e.g. REF2024001"
          value={newDealer.referenceNo}
          onChange={(e) => setNewDealer({ ...newDealer, referenceNo: e.target.value })}
          className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.referenceNo ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
        />
      </div>
      {formErrors.referenceNo && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.referenceNo}</p>}
    </div>

    {/* Dealer Code */}
    <div className="space-y-1.5">
      <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Dealer Code*</label>
      <div className="relative">
        <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Unique Code (e.g. D005)"
          value={newDealer.dealerCode}
          onChange={(e) => setNewDealer({ ...newDealer, dealerCode: e.target.value })}
          className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.dealerCode ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
        />
      </div>
      {formErrors.dealerCode && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.dealerCode}</p>}
    </div>

    {/* Dealership Name */}
    <div className="space-y-1.5 md:col-span-2">
      <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Dealership Name*</label>
      <div className="relative">
        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="e.g. Kinetic Mumbai Central"
          value={newDealer.dealershipName}
          onChange={(e) => setNewDealer({ ...newDealer, dealershipName: e.target.value })}
          className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.dealershipName ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
        />
      </div>
      {formErrors.dealershipName && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.dealershipName}</p>}
    </div>
  </div>
</div>

{/* Party Creation Details */ }
<div className="space-y-4">
  <h3 className={`text-sm font-bold uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Party Creation Details</h3>
  <div className="space-y-4">
    {/* Dealer's Address */}
    <div className="space-y-1.5">
      <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Dealer's Address*</label>
      <div className="relative">
        <MapPin className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
        <textarea
          placeholder="Plot No, Street, Landmark..."
          rows={2}
          value={newDealer.address}
          onChange={(e) => setNewDealer({ ...newDealer, address: e.target.value })}
          className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none resize-none ${formErrors.address ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
        ></textarea>
      </div>
      {formErrors.address && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.address}</p>}
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {/* State */}
      <div className="space-y-1.5">
        <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>State*</label>
        <input
          type="text"
          placeholder="State"
          value={newDealer.state}
          onChange={(e) => setNewDealer({ ...newDealer, state: e.target.value })}
          className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.state ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
        />
        {formErrors.state && <p className="text-xs text-red-500 mt-1 ml-1">{formErrors.state}</p>}
      </div>

      {/* Zone */}
      <div className="space-y-1.5">
        <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Zone*</label>
        <select
          value={newDealer.zone}
          onChange={(e) => setNewDealer({ ...newDealer, zone: e.target.value })}
          className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.zone ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
        >
          <option value="">Select Zone</option>
          <option value="North">North</option>
          <option value="South">South</option>
          <option value="East">East</option>
          <option value="West">West</option>
          <option value="Central">Central</option>
        </select>
        {formErrors.zone && <p className="text-xs text-red-500 mt-1 ml-1">{formErrors.zone}</p>}
      </div>

      {/* Location */}
      <div className="space-y-1.5">
        <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Location*</label>
        <input
          type="text"
          placeholder="City"
          value={newDealer.location}
          onChange={(e) => setNewDealer({ ...newDealer, location: e.target.value })}
          className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.location ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
        />
        {formErrors.location && <p className="text-xs text-red-500 mt-1 ml-1">{formErrors.location}</p>}
      </div>

      {/* Pin Code */}
      <div className="space-y-1.5">
        <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Pin Code*</label>
        <input
          type="text"
          placeholder="6 Digits"
          maxLength={6}
          value={newDealer.pincode}
          onChange={(e) => setNewDealer({ ...newDealer, pincode: e.target.value })}
          className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.pincode ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
        />
        {formErrors.pincode && <p className="text-xs text-red-500 mt-1 ml-1">{formErrors.pincode}</p>}
      </div>
    </div>
  </div>
</div>

{/* Contact Information */ }
<div className="space-y-4">
  <h3 className={`text-sm font-bold uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Contact Information</h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Partner's Name */}
    <div className="space-y-1.5">
      <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Partner's Name*</label>
      <div className="relative">
        <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Owner/Partner Name"
          value={newDealer.partnerName}
          onChange={(e) => setNewDealer({ ...newDealer, partnerName: e.target.value })}
          className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.partnerName ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
        />
      </div>
      {formErrors.partnerName && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.partnerName}</p>}
    </div>

    {/* Contact Person Name */}
    <div className="space-y-1.5">
      <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Contact Person Name*</label>
      <div className="relative">
        <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Contact Person"
          value={newDealer.contactPersonName}
          onChange={(e) => setNewDealer({ ...newDealer, contactPersonName: e.target.value })}
          className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.contactPersonName ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
        />
      </div>
      {formErrors.contactPersonName && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.contactPersonName}</p>}
    </div>

    {/* Mobile No */}
    <div className="space-y-1.5">
      <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Mobile No.*</label>
      <div className="relative">
        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="tel"
          placeholder="+91 9876543210"
          value={newDealer.mobileNo}
          onChange={(e) => setNewDealer({ ...newDealer, mobileNo: e.target.value })}
          className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.mobileNo ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
        />
      </div>
      {formErrors.mobileNo && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.mobileNo}</p>}
    </div>

    {/* E-mail ID */}
    <div className="space-y-1.5">
      <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>E-mail ID*</label>
      <div className="relative">
        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="email"
          placeholder="dealer@kinetic.com"
          value={newDealer.email}
          onChange={(e) => setNewDealer({ ...newDealer, email: e.target.value })}
          className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.email ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
        />
      </div>
      {formErrors.email && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.email}</p>}
    </div>
  </div>
</div>

{/* Legal & Business Details */ }
<div className="space-y-4">
  <h3 className={`text-sm font-bold uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Legal & Business Details</h3>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {/* GST No */}
    <div className="space-y-1.5 md:col-span-3">
      <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>GST No.*</label>
      <div className="relative">
        <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="e.g. 27AAPFU0939F1ZV"
          maxLength={15}
          value={newDealer.gstNo}
          onChange={(e) => setNewDealer({ ...newDealer, gstNo: e.target.value.toUpperCase() })}
          className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.gstNo ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
        />
      </div>
      {formErrors.gstNo && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.gstNo}</p>}
    </div>

    {/* LOI Date */}
    <div className="space-y-1.5">
      <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>LOI Date*</label>
      <div className="relative">
        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="date"
          value={newDealer.loiDate}
          onChange={(e) => setNewDealer({ ...newDealer, loiDate: e.target.value })}
          className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.loiDate ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
        />
      </div>
      {formErrors.loiDate && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.loiDate}</p>}
    </div>

    {/* LOI Valid Upto */}
    <div className="space-y-1.5">
      <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>LOI Valid Upto*</label>
      <div className="relative">
        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="date"
          value={newDealer.loiValidUpto}
          onChange={(e) => setNewDealer({ ...newDealer, loiValidUpto: e.target.value })}
          className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.loiValidUpto ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
        />
      </div>
      {formErrors.loiValidUpto && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.loiValidUpto}</p>}
    </div>

    {/* Lead Status */}
    <div className="space-y-1.5">
      <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Lead Status*</label>
      <select
        value={newDealer.leadStatus}
        onChange={(e) => setNewDealer({ ...newDealer, leadStatus: e.target.value as 'Digital' | 'Newspaper' | 'Scouting' })}
        className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
      >
        <option value="Digital">Digital</option>
        <option value="Newspaper">Newspaper</option>
        <option value="Scouting">Scouting</option>
      </select>
    </div>
  </div>
</div>
