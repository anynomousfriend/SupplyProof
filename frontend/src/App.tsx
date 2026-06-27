import { useState, useEffect } from 'react';
import AutocompleteInput from './components/AutocompleteInput';
import { Toaster, toast } from 'react-hot-toast';
import { Agentation } from 'agentation';
import { 
  Box, 
  Settings, 
  ShieldCheck, 
  MapPin, 
  Wallet,
  LogOut,
  Package,
  Layers,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Activity
} from 'lucide-react';

import {
  kit,
  setRegistryContractId,
  setTrackerContractId,
  invokeRegisterProduct,
  invokeAddHandler,
  invokeRecordCheckpoint,
  fetchCheckpoints,
  hashProductId,
} from './lib/stellar';

function App() {
  const [address, setAddress] = useState("");
  const [activeTab, setActiveTab] = useState("config");
  const [loading, setLoading] = useState(false);
  
  const [registryInput, setRegistryInput] = useState("");
  const [trackerInput, setTrackerInput] = useState("");

  const [productName, setProductName] = useState("");
  const [currentProductId, setCurrentProductId] = useState("");
  const [handlerAddress, setHandlerAddress] = useState("");
  const [handlerRole, setHandlerRole] = useState("Manufacturer");
  
  const [checkpointLocation, setCheckpointLocation] = useState("");
  const [checkpointStatus, setCheckpointStatus] = useState("");
  
  const [verifyProductId, setVerifyProductId] = useState("");
  const [checkpoints, setCheckpoints] = useState<any[]>([]);

  // Automatically fetch from kit if connected
  useEffect(() => {
    const checkConnection = async () => {
      // In a real app we'd restore session, omitting for brevity
    };
    checkConnection();
  }, []);

  const connect = async () => {
    try {
      const { address } = await kit.authModal();
      setAddress(address);
    } catch (e) {
      console.error(e);
    }
  };

  const disconnect = () => { setAddress(""); };

  const handleSetRegistry = () => {
    if (registryInput.trim()) {
      setRegistryContractId(registryInput.trim());
      toast.success("Registry ID Configured");
    }
  };

  const handleSetTracker = () => {
    if (trackerInput.trim()) {
      setTrackerContractId(trackerInput.trim());
      toast.success("Tracker ID Configured");
    }
  };

  const handleRegisterProduct = async () => {
    if (!address) return toast.error("Please connect wallet first.");
    if (!productName.trim()) return toast.error("Enter a product name.");
    setLoading(true);
    const toastId = toast.loading("Building transaction...");
    try {
      const id = await hashProductId(productName.trim());
      const xdr = await invokeRegisterProduct(address, id, productName.trim());
      toast.loading("Sign in wallet...", { id: toastId });
      const { signedTxXdr } = await kit.signTransaction(xdr, { networkPassphrase: "Test SDF Network ; September 2015" });
      
      let result;
      try {
         const response = await fetch("https://horizon-testnet.stellar.org/transactions", {
             method: "POST",
             headers: { "Content-Type": "application/x-www-form-urlencoded" },
             body: new URLSearchParams({ tx: signedTxXdr }).toString()
         });
         result = await response.json();
         if (!response.ok) throw new Error(result.title || "Transaction failed");
      } catch (err: any) {
         throw new Error("Submit failed: " + err.message);
      }
      
      setCurrentProductId(id);
      setVerifyProductId(id);
      
      toast.success("Product registered!", { id: toastId });
      setProductName("");
      setActiveTab("roles"); // Auto navigate
    } catch (e: any) { toast.error(e.message, { id: toastId }); } finally { setLoading(false); }
  };

  const handleAddHandler = async () => {
    if (!address) return toast.error("Please connect wallet first.");
    if (!currentProductId) return toast.error("Register or verify a product first.");
    if (!handlerAddress.trim() || !handlerRole.trim()) return toast.error("Fill all fields.");
    setLoading(true);
    const toastId = toast.loading("Building transaction...");
    try {
      const xdr = await invokeAddHandler(address, currentProductId, handlerAddress.trim(), handlerRole.trim());
      toast.loading("Sign in wallet...", { id: toastId });
      const { signedTxXdr } = await kit.signTransaction(xdr, { networkPassphrase: "Test SDF Network ; September 2015" });
      
      let result;
      try {
         const response = await fetch("https://horizon-testnet.stellar.org/transactions", {
             method: "POST",
             headers: { "Content-Type": "application/x-www-form-urlencoded" },
             body: new URLSearchParams({ tx: signedTxXdr }).toString()
         });
         result = await response.json();
         if (!response.ok) throw new Error(result.title || "Transaction failed");
      } catch (err: any) {
         throw new Error("Submit failed: " + err.message);
      }
      
      toast.success("Handler authorized!", { id: toastId });
      setHandlerAddress("");
    } catch (e: any) { toast.error(e.message, { id: toastId }); } finally { setLoading(false); }
  };

  const handleRecordCheckpoint = async () => {
    if (!address) return toast.error("Please connect wallet first.");
    if (!currentProductId) return toast.error("Register or verify a product first.");
    if (!checkpointLocation.trim() || !checkpointStatus.trim()) return toast.error("Fill all fields.");
    setLoading(true);
    const toastId = toast.loading("Building transaction...");
    try {
      const xdr = await invokeRecordCheckpoint(address, currentProductId, checkpointLocation.trim(), checkpointStatus.trim());
      toast.loading("Sign in wallet...", { id: toastId });
      const { signedTxXdr } = await kit.signTransaction(xdr, { networkPassphrase: "Test SDF Network ; September 2015" });
      
      let result;
      try {
         const response = await fetch("https://horizon-testnet.stellar.org/transactions", {
             method: "POST",
             headers: { "Content-Type": "application/x-www-form-urlencoded" },
             body: new URLSearchParams({ tx: signedTxXdr }).toString()
         });
         result = await response.json();
         if (!response.ok) throw new Error(result.title || "Transaction failed");
      } catch (err: any) {
         throw new Error("Submit failed: " + err.message);
      }
      
      toast.success("Checkpoint recorded!", { id: toastId });
      setCheckpointLocation("");
      setCheckpointStatus("");
    } catch (e: any) { toast.error(e.message, { id: toastId }); } finally { setLoading(false); }
  };

  const handleVerify = async () => {
    if (!verifyProductId.trim()) return toast.error("Enter a product ID.");
    setLoading(true);
    try {
      setCurrentProductId(verifyProductId);
      const chks = await fetchCheckpoints(verifyProductId);
      setCheckpoints(chks);
      if (chks.length === 0) toast.error("No checkpoints found for this ID.");
      else toast.success(`Found ${chks.length} checkpoints.`);
    } catch (e: any) { toast.error("Verification failed: " + e.message); } finally { setLoading(false); }
  };

  const TABS = [
    { id: 'config', label: 'Config', icon: Settings },
    { id: 'registry', label: 'Mint', icon: Package },
    { id: 'roles', label: 'Roles', icon: ShieldCheck },
    { id: 'tracking', label: 'Track', icon: MapPin },
    { id: 'verify', label: 'Audit', icon: CheckCircle2 },
  ];
  
  const activeTabIndex = TABS.findIndex(t => t.id === activeTab);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative bg-bg-base text-primary font-sans p-6 overflow-hidden">
      <Toaster position="top-center" toastOptions={{ 
        style: { background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)' }
      }} />

      <div className="w-full max-w-[800px] flex flex-col gap-8 animate-fade-in z-10 h-full max-h-[900px] py-4">
        
        {/* Navigation Header */}
        <header className="relative flex justify-between items-center px-2 shrink-0">
          <button 
            className="w-10 h-10 rounded-full bg-bg-surface border border-border-subtle flex items-center justify-center hover:bg-bg-surface-elevated transition-all z-10"
            onClick={() => {
               if (activeTabIndex > 0) setActiveTab(TABS[activeTabIndex - 1].id);
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[13px] font-medium text-secondary tracking-[-0.01em] uppercase pointer-events-none">
            STEP 0{activeTabIndex + 1} OF 0{TABS.length}
          </div>
          {address ? (
            <div className="flex items-center bg-bg-surface border border-border-subtle rounded-full overflow-hidden">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(address);
                  toast.success("Address copied!");
                }}
                className="px-4 py-2 text-sm font-mono font-medium text-secondary hover:text-primary hover:bg-bg-surface-elevated transition-all flex items-center gap-2 border-r border-border-subtle"
              >
                <Wallet className="w-3.5 h-3.5" />
                {address.substring(0, 5)}...{address.substring(address.length - 4)}
              </button>
              <button 
                onClick={disconnect} 
                className="px-3 py-2 text-secondary hover:text-red-400 hover:bg-bg-surface-elevated transition-all flex items-center"
                title="Disconnect"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={connect} className="px-[18px] py-2 bg-bg-surface border border-border-subtle rounded-full text-sm font-medium text-secondary hover:text-primary hover:bg-bg-surface-elevated transition-all flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5" /> Connect
            </button>
          )}
        </header>

        {/* Main Form Panel */}
        <main className="bg-bg-surface backdrop-blur-[24px] border border-border-subtle rounded-[28px] p-8 md:p-12 flex flex-col gap-10 shadow-[0_40px_100px_rgba(0,0,0,0.5)] flex-1 overflow-hidden">
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-8">
            
            {/* Dynamic Content Based on Tab */}
            {activeTab === 'config' && (
              <section className="flex flex-col gap-6 animate-slide-up">
                <div className="flex flex-col gap-3">
                  <div className="text-[24px] font-semibold tracking-[-0.02em]">Smart Contracts</div>
                  <div className="text-sm text-secondary leading-relaxed">Bind the UI to your deployed Soroban instances. Data flows to the network securely.</div>
                </div>
                
                <div className="relative mt-3 flex flex-col gap-6">
                  <div className="flex flex-col gap-3">
                    <label className="text-[11px] font-semibold text-secondary tracking-[0.02em] uppercase">Product Registry ID</label>
                    <div className="flex gap-3">
                      <AutocompleteInput 
                        value={registryInput} 
                        onChange={setRegistryInput}
                        className="w-full bg-bg-input border border-border-subtle rounded-[18px] px-6 py-5 text-[16px] text-primary focus:outline-none focus:bg-bg-input-focus focus:border-border-focus transition-all font-mono placeholder:text-tertiary"
                        placeholder="C..."
                        storageKey="contract_ids"
                      />
                      <button onClick={handleSetRegistry} className="px-6 rounded-[18px] border border-border-subtle hover:bg-white hover:text-black transition-all font-medium">Save</button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <label className="text-[11px] font-semibold text-secondary tracking-[0.02em] uppercase">Logistics Tracker ID</label>
                    <div className="flex gap-3">
                      <AutocompleteInput 
                        value={trackerInput} 
                        onChange={setTrackerInput}
                        className="w-full bg-bg-input border border-border-subtle rounded-[18px] px-6 py-5 text-[16px] text-primary focus:outline-none focus:bg-bg-input-focus focus:border-border-focus transition-all font-mono placeholder:text-tertiary"
                        placeholder="C..."
                        storageKey="contract_ids"
                      />
                      <button onClick={handleSetTracker} className="px-6 rounded-[18px] border border-border-subtle hover:bg-white hover:text-black transition-all font-medium">Save</button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'registry' && (
              <section className="flex flex-col gap-6 animate-slide-up h-full">
                <div className="flex flex-col gap-3 shrink-0">
                  <div className="text-[24px] font-semibold tracking-[-0.02em]">Mint Physical Asset</div>
                  <div className="text-sm text-secondary leading-relaxed">Register a new physical product on the decentralized ledger to begin its tracking journey.</div>
                </div>
                
                <div className="relative mt-3 flex-1 flex flex-col justify-center">
                  <label className="text-[11px] font-semibold text-secondary tracking-[0.02em] uppercase mb-3">Product Identifier</label>
                  <input 
                    type="text" 
                    value={productName} 
                    onChange={e => setProductName(e.target.value)}
                    className="w-full bg-bg-input border border-border-subtle rounded-[18px] px-6 py-5 text-[18px] text-primary focus:outline-none focus:bg-bg-input-focus focus:border-border-focus transition-all placeholder:text-tertiary"
                    placeholder="e.g. Ethiopian Coffee Batch #092"
                  />
                </div>

                <div className="flex justify-center mt-4 shrink-0">
                  <button 
                    onClick={handleRegisterProduct}
                    disabled={loading}
                    className="bg-[rgba(255,255,255,0.1)] border border-border-subtle px-10 py-3.5 rounded-full text-primary font-medium text-[15px] cursor-pointer backdrop-blur-[10px] hover:bg-primary hover:text-black hover:-translate-y-[1px] transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? <Activity className="w-5 h-5 animate-spin" /> : "Sign & Register"}
                  </button>
                </div>
              </section>
            )}

            {activeTab === 'roles' && (
              <section className="flex flex-col gap-6 animate-slide-up h-full">
                <div className="flex flex-col gap-3 shrink-0">
                  <div className="text-[24px] font-semibold tracking-[-0.02em]">Authorize Handlers</div>
                  <div className="text-sm text-secondary leading-relaxed">Delegate tracking permissions to supply chain actors so they can append data.</div>
                </div>
                
                {!currentProductId ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-secondary border border-dashed border-border-subtle rounded-[18px] p-6 text-sm">
                    <Box className="w-8 h-8 mb-4 opacity-50" />
                    Please register or verify a product first.
                  </div>
                ) : (
                  <div className="relative mt-3 flex-1 flex flex-col justify-center gap-6">
                    <div className="flex flex-col gap-3">
                      <label className="text-[11px] font-semibold text-secondary tracking-[0.02em] uppercase">Target Product ID</label>
                      <div className="px-6 py-4 bg-bg-input rounded-[18px] border border-border-subtle font-mono text-secondary text-[14px]">
                        {currentProductId}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <label className="text-[11px] font-semibold text-secondary tracking-[0.02em] uppercase">Stellar Address</label>
                      <AutocompleteInput 
                        value={handlerAddress} 
                        onChange={setHandlerAddress}
                        className="w-full bg-bg-input border border-border-subtle rounded-[18px] px-6 py-5 text-[16px] text-primary focus:outline-none focus:bg-bg-input-focus focus:border-border-focus transition-all font-mono placeholder:text-tertiary"
                        placeholder="G..."
                        storageKey="stellar_addresses"
                        suggestions={address ? [address] : []}
                      />
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <label className="text-[11px] font-semibold text-secondary tracking-[0.02em] uppercase">Assign Role</label>
                      <select 
                        value={handlerRole} 
                        onChange={e => setHandlerRole(e.target.value)}
                        className="w-full bg-bg-input border border-border-subtle rounded-[18px] px-6 py-5 text-[16px] text-primary focus:outline-none focus:bg-bg-input-focus focus:border-border-focus transition-all appearance-none"
                      >
                        <option value="Manufacturer">Manufacturer</option>
                        <option value="Distributor">Distributor</option>
                        <option value="Retailer">Retailer</option>
                        <option value="Inspector">Inspector</option>
                        <option value="Transporter">Transporter</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex justify-center mt-4 shrink-0">
                  <button 
                    onClick={handleAddHandler}
                    disabled={loading || !currentProductId}
                    className="bg-[rgba(255,255,255,0.1)] border border-border-subtle px-10 py-3.5 rounded-full text-primary font-medium text-[15px] cursor-pointer backdrop-blur-[10px] hover:bg-primary hover:text-black hover:-translate-y-[1px] transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? <Activity className="w-5 h-5 animate-spin" /> : "Authorize Actor"}
                  </button>
                </div>
              </section>
            )}

            {activeTab === 'tracking' && (
              <section className="flex flex-col gap-6 animate-slide-up h-full">
                <div className="flex flex-col gap-3 shrink-0">
                  <div className="text-[24px] font-semibold tracking-[-0.02em]">Record Checkpoint</div>
                  <div className="text-sm text-secondary leading-relaxed">Submit a verifiable physical state update to the decentralized ledger.</div>
                </div>
                
                {!currentProductId ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-secondary border border-dashed border-border-subtle rounded-[18px] p-6 text-sm">
                    <Box className="w-8 h-8 mb-4 opacity-50" />
                    Please register or verify a product first.
                  </div>
                ) : (
                  <div className="relative mt-3 flex-1 flex flex-col justify-center gap-6">
                    <div className="flex flex-col gap-3">
                      <label className="text-[11px] font-semibold text-secondary tracking-[0.02em] uppercase">Target Product ID</label>
                      <div className="px-6 py-4 bg-bg-input rounded-[18px] border border-border-subtle font-mono text-secondary text-[14px]">
                        {currentProductId}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="flex flex-col gap-3">
                        <label className="text-[11px] font-semibold text-secondary tracking-[0.02em] uppercase">Location</label>
                        <AutocompleteInput 
                          value={checkpointLocation} 
                          onChange={setCheckpointLocation}
                          className="w-full bg-bg-input border border-border-subtle rounded-[18px] px-6 py-5 text-[16px] text-primary focus:outline-none focus:bg-bg-input-focus focus:border-border-focus transition-all placeholder:text-tertiary"
                          placeholder="e.g. Port of Long Beach"
                          storageKey="locations"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-3">
                        <label className="text-[11px] font-semibold text-secondary tracking-[0.02em] uppercase">Status</label>
                        <AutocompleteInput 
                          value={checkpointStatus} 
                          onChange={setCheckpointStatus}
                          className="w-full bg-bg-input border border-border-subtle rounded-[18px] px-6 py-5 text-[16px] text-primary focus:outline-none focus:bg-bg-input-focus focus:border-border-focus transition-all placeholder:text-tertiary"
                          placeholder="e.g. Cleared Customs"
                          storageKey="statuses"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-center mt-4 shrink-0">
                  <button 
                    onClick={handleRecordCheckpoint}
                    disabled={loading || !currentProductId}
                    className="bg-[rgba(255,255,255,0.1)] border border-border-subtle px-10 py-3.5 rounded-full text-primary font-medium text-[15px] cursor-pointer backdrop-blur-[10px] hover:bg-primary hover:text-black hover:-translate-y-[1px] transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? <Activity className="w-5 h-5 animate-spin" /> : "Commit Checkpoint"}
                  </button>
                </div>
              </section>
            )}

            {activeTab === 'verify' && (
              <section className="flex flex-col gap-6 animate-slide-up h-full">
                <div className="flex flex-col gap-3 shrink-0">
                  <div className="text-[24px] font-semibold tracking-[-0.02em]">Lineage Verification</div>
                  <div className="text-sm text-secondary leading-relaxed">Retrieve and audit the complete, immutable history of an asset.</div>
                </div>
                
                <div className="flex gap-3 mt-3 shrink-0">
                  <AutocompleteInput 
                    value={verifyProductId} 
                    onChange={setVerifyProductId}
                    className="flex-1 bg-bg-input border border-border-subtle rounded-[18px] px-6 py-5 text-[16px] text-primary focus:outline-none focus:bg-bg-input-focus focus:border-border-focus transition-all font-mono placeholder:text-tertiary"
                    placeholder="Enter Product ID Hex..."
                    storageKey="product_ids"
                    suggestions={currentProductId ? [currentProductId] : []}
                  />
                  <button 
                    onClick={handleVerify} 
                    disabled={loading}
                    className="px-8 rounded-[18px] border border-border-subtle hover:bg-white hover:text-black transition-all font-medium flex items-center justify-center disabled:opacity-50"
                  >
                    {loading ? <Activity className="w-5 h-5 animate-spin" /> : "Audit"}
                  </button>
                </div>

                <div className="flex-1 mt-4">
                  {checkpoints.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-secondary border border-dashed border-border-subtle rounded-[18px] p-10 text-sm h-full">
                      <Layers className="w-8 h-8 mb-4 opacity-50" />
                      No lineage data found.
                    </div>
                  ) : (
                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-px before:bg-border-subtle">
                      {checkpoints.map((cp, idx) => {
                        const ts = typeof cp.timestamp === 'bigint' ? Number(cp.timestamp) : Number(cp.timestamp || 0);
                        const handler = typeof cp.handler === 'string' ? cp.handler : String(cp.handler || 'unknown');
                        return (
                        <div key={idx} className="relative flex items-center justify-between md:justify-center md:odd:flex-row-reverse group animate-fade-in" style={{animationDelay: `${idx * 0.1}s`}}>
                          {/* Timeline dot */}
                          <div className="flex items-center justify-center w-8 h-8 rounded-full border border-border-subtle bg-[#0a0a0a] shadow-lg shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                            <div className="w-2.5 h-2.5 bg-primary rounded-full opacity-80"></div>
                          </div>
                          
                          {/* Content */}
                          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-bg-surface-elevated p-5 rounded-[18px] border border-border-subtle shadow-sm hover:bg-[rgba(255,255,255,0.1)] transition-colors">
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-semibold text-primary">{String(cp.status)}</span>
                              <div className="flex items-center text-[11px] text-tertiary">
                                <Clock className="w-3 h-3 mr-1" />
                                {ts > 0 ? new Date(ts * 1000).toLocaleString() : 'N/A'}
                              </div>
                            </div>
                            <div className="text-secondary text-sm flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-tertiary" />
                              {String(cp.location)}
                            </div>
                            <div className="mt-4 pt-4 border-t border-border-subtle text-[11px] text-tertiary font-mono flex flex-col gap-2">
                              <div>Handler: <span className="text-secondary">{handler.substring(0,8)}...{handler.substring(handler.length-4)}</span></div>
                              <div>Stage: <span className="text-secondary">{String(cp.stage)}</span></div>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            )}

          </div>

          {/* Navigation / Parameters row (Tabs) */}
          <section className="flex gap-4 mt-auto justify-center shrink-0 border-t border-border-subtle pt-8">
            {TABS.map((tab) => (
              <div 
                key={tab.id} 
                className={`flex flex-col items-center gap-3 flex-1 max-w-[80px] cursor-pointer group ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-200
                  ${activeTab === tab.id 
                    ? 'bg-primary text-black border-transparent' 
                    : 'bg-bg-surface text-primary border-border-subtle group-hover:bg-bg-surface-elevated'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                </div>
                <span className={`text-[11px] font-semibold tracking-[0.02em] ${activeTab === tab.id ? 'text-primary' : 'text-secondary group-hover:text-primary'}`}>
                  {tab.label}
                </span>
              </div>
            ))}
          </section>

        </main>

        {/* Helper Footer */}
        <footer className="flex justify-center gap-6 mt-2 shrink-0">
          <span className="text-[11px] uppercase tracking-[0.1em] text-tertiary">SupplyProof</span>
        </footer>
        
      </div>
      
      {import.meta.env.DEV && <Agentation endpoint="http://localhost:4747" />}
    </div>
  );
}

export default App;
