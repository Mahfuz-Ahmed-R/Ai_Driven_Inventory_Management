export const DREAMS_PRODUCTS = [
  { sku: "PT001", product_name: "Lenovo IdeaPad 3", category: "Computers", sub_category: "Laptops", brand: "Lenovo", unit: "Pc", price: 600, current_stock: 100, qty_alert: 15, mfg_date: "2024-12-24", exp_date: "2026-12-20", warehouse: "Lavish Warehouse", store_id: "Electro Mart", total_28d_demand: 42, method: "LightGBM" },
  { sku: "PT002", product_name: "Beats Pro", category: "Electronics", sub_category: "Audio", brand: "Beats", unit: "Pc", price: 160, current_stock: 140, qty_alert: 20, mfg_date: "2024-12-10", exp_date: "2026-12-07", warehouse: "Quaint Warehouse", store_id: "Quantum Gadgets", total_28d_demand: 58, method: "LightGBM" },
  { sku: "PT003", product_name: "Nike Jordan", category: "Shoe", sub_category: "Sneakers", brand: "Nike", unit: "Pc", price: 110, current_stock: 300, qty_alert: 25, mfg_date: "2024-11-27", exp_date: "2026-11-20", warehouse: "Traditional Warehouse", store_id: "Prime Bazaar", total_28d_demand: 95, method: "LightGBM" },
  { sku: "PT004", product_name: "Apple Series 5 Watch", category: "Electronics", sub_category: "Wearables", brand: "Apple", unit: "Pc", price: 120, current_stock: 450, qty_alert: 30, mfg_date: "2024-11-18", exp_date: "2026-11-15", warehouse: "Cool Warehouse", store_id: "Gadget World", total_28d_demand: 112, method: "LightGBM" },
  { sku: "PT005", product_name: "Amazon Echo Dot", category: "Electronics", sub_category: "Smart Home", brand: "Amazon", unit: "Pc", price: 80, current_stock: 320, qty_alert: 20, mfg_date: "2024-11-06", exp_date: "2026-11-04", warehouse: "Overflow Warehouse", store_id: "Volt Vault", total_28d_demand: 84, method: "LightGBM" },
  { sku: "PT006", product_name: "Sanford Chair Sofa", category: "Furniture", sub_category: "Living Room", brand: "Nilkamal", unit: "Pc", price: 320, current_stock: 650, qty_alert: 15, mfg_date: "2024-10-25", exp_date: "2026-10-20", warehouse: "Nova Storage Hub", store_id: "Elite Retail", total_28d_demand: 28, method: "LightGBM" },
  { sku: "PT007", product_name: "Red Premium Satchel", category: "Bags", sub_category: "Backpacks", brand: "Woodmart", unit: "Pc", price: 60, current_stock: 700, qty_alert: 30, mfg_date: "2024-10-14", exp_date: "2026-10-10", warehouse: "Retail Supply Hub", store_id: "Prime Mart", total_28d_demand: 140, method: "LightGBM" },
  { sku: "PT008", product_name: "Iphone 14 Pro", category: "Phone", sub_category: "Smartphones", brand: "Apple", unit: "Pc", price: 540, current_stock: 630, qty_alert: 20, mfg_date: "2024-10-03", exp_date: "2026-10-01", warehouse: "EdgeWare Solutions", store_id: "NeoTech Store", total_28d_demand: 75, method: "LightGBM" },
  { sku: "PT009", product_name: "Gaming Chair", category: "Furniture", sub_category: "Office", brand: "Nilkamal", unit: "Bx", price: 200, current_stock: 410, qty_alert: 10, mfg_date: "2024-09-20", exp_date: "2026-09-18", warehouse: "North Zone Warehouse", store_id: "Urban Mart", total_28d_demand: 36, method: "LightGBM" },
  { sku: "PT010", product_name: "Borealis Backpack", category: "Bags", sub_category: "Travel", brand: "The North Face", unit: "Pc", price: 45, current_stock: 550, qty_alert: 25, mfg_date: "2024-09-10", exp_date: "2026-09-08", warehouse: "Fulfillment Hub", store_id: "Travel Mart", total_28d_demand: 120, method: "LightGBM" },
];

export const DREAMS_CATEGORIES = [
  { id: 1, name: "Computers", slug: "computers", created_on: "24 Dec 2024", status: "Active" },
  { id: 2, name: "Electronics", slug: "electronics", created_on: "10 Dec 2024", status: "Active" },
  { id: 3, name: "Shoe", slug: "shoe", created_on: "27 Nov 2024", status: "Active" },
  { id: 4, name: "Cosmetics", slug: "cosmetics", created_on: "18 Nov 2024", status: "Active" },
  { id: 5, name: "Groceries", slug: "groceries", created_on: "06 Nov 2024", status: "Active" },
  { id: 6, name: "Furniture", slug: "furniture", created_on: "25 Oct 2024", status: "Active" },
  { id: 7, name: "Bags", slug: "bags", created_on: "14 Oct 2024", status: "Active" },
  { id: 8, name: "Phone", slug: "phone", created_on: "03 Oct 2024", status: "Active" },
  { id: 9, name: "Appliances", slug: "appliances", created_on: "20 Sep 2024", status: "Active" },
  { id: 10, name: "Clothing", slug: "clothing", created_on: "10 Sep 2024", status: "Inactive" },
];

export const DREAMS_SUB_CATEGORIES = [
  { code: "CT001", category: "Computers", sub_category: "Laptops", description: "Efficient Productivity", status: "Active" },
  { code: "CT002", category: "Computers", sub_category: "Desktops", description: "Compact Design", status: "Active" },
  { code: "CT003", category: "Shoe", sub_category: "Sneakers", description: "Dynamic Grip", status: "Active" },
  { code: "CT004", category: "Shoe", sub_category: "Sandals", description: "Stylish Comfort", status: "Active" },
  { code: "CT005", category: "Electronics", sub_category: "Smart Home", description: "Seamless Connectivity", status: "Active" },
  { code: "CT006", category: "Electronics", sub_category: "Audio", description: "Reliable Sound", status: "Active" },
  { code: "CT007", category: "Bags", sub_category: "Handbags", description: "Compact Carry", status: "Active" },
  { code: "CT008", category: "Bags", sub_category: "Travel", description: "Travel Ready", status: "Active" },
  { code: "CT009", category: "Furniture", sub_category: "Living Room", description: "Cozy Comfort", status: "Active" },
  { code: "CT010", category: "Phone", sub_category: "Smartphones", description: "Flagship Devices", status: "Active" },
];

export const DREAMS_BRANDS = [
  { id: 1, name: "Lenovo", created_date: "24 Dec 2024", status: "Active" },
  { id: 2, name: "Beats", created_date: "10 Dec 2024", status: "Active" },
  { id: 3, name: "Nike", created_date: "27 Nov 2024", status: "Active" },
  { id: 4, name: "Apple", created_date: "18 Nov 2024", status: "Active" },
  { id: 5, name: "Amazon", created_date: "06 Nov 2024", status: "Active" },
  { id: 6, name: "Woodmart", created_date: "25 Oct 2024", status: "Active" },
  { id: 7, name: "Dior", created_date: "14 Oct 2024", status: "Active" },
  { id: 8, name: "Lava", created_date: "03 Oct 2024", status: "Active" },
  { id: 9, name: "Nilkamal", created_date: "20 Sep 2024", status: "Active" },
  { id: 10, name: "The North Face", created_date: "10 Sep 2024", status: "Active" },
];

export const DREAMS_UNITS = [
  { id: 1, name: "Kilograms", short_name: "kg", products: 25, created_date: "24 Dec 2024", status: "Active" },
  { id: 2, name: "Liters", short_name: "l", products: 18, created_date: "10 Dec 2024", status: "Active" },
  { id: 3, name: "Dozen", short_name: "dz", products: 30, created_date: "27 Nov 2024", status: "Active" },
  { id: 4, name: "Pieces", short_name: "pcs", products: 42, created_date: "18 Nov 2024", status: "Active" },
  { id: 5, name: "Boxes", short_name: "bx", products: 14, created_date: "06 Nov 2024", status: "Active" },
  { id: 6, name: "Tons", short_name: "t", products: 8, created_date: "25 Oct 2024", status: "Active" },
  { id: 7, name: "Bundles", short_name: "bn", products: 12, created_date: "14 Oct 2024", status: "Active" },
  { id: 8, name: "Grams", short_name: "g", products: 22, created_date: "03 Oct 2024", status: "Active" },
  { id: 9, name: "Meters", short_name: "m", products: 19, created_date: "20 Sep 2024", status: "Active" },
  { id: 10, name: "Centimeters", short_name: "cm", products: 11, created_date: "10 Sep 2024", status: "Active" },
];

export const DREAMS_VARIANTS = [
  { id: 1, variant: "Size", values: ["XS", "S", "M", "L", "XL"], created_date: "24 Dec 2024", status: "Active" },
  { id: 2, variant: "Color", values: ["Red", "Blue", "Green"], created_date: "10 Dec 2024", status: "Active" },
  { id: 3, variant: "Capacity", values: ["Small", "Medium", "Large"], created_date: "27 Nov 2024", status: "Active" },
  { id: 4, variant: "Material", values: ["Cotton", "Leather", "Synthetic"], created_date: "18 Nov 2024", status: "Active" },
  { id: 5, variant: "Weight", values: ["Light", "Heavy"], created_date: "06 Nov 2024", status: "Active" },
  { id: 6, variant: "Style", values: ["Casual", "Formal", "Sporty"], created_date: "25 Oct 2024", status: "Active" },
  { id: 7, variant: "Pattern", values: ["Solid", "Striped", "Printed"], created_date: "14 Oct 2024", status: "Active" },
  { id: 8, variant: "Memory", values: ["8 GB", "16 GB", "36 GB"], created_date: "03 Oct 2024", status: "Active" },
  { id: 9, variant: "Storage", values: ["128 GB", "256 GB", "512 GB", "1TB"], created_date: "20 Sep 2024", status: "Active" },
  { id: 10, variant: "Length", values: ["Short", "Regular", "Long"], created_date: "10 Sep 2024", status: "Active" },
];

export const DREAMS_WARRANTIES = [
  { id: 1, name: "Replacement Warranty", description: "Covers replacement of faulty items", duration: "2 Year", status: "Active" },
  { id: 2, name: "On-Site Warranty", description: "Product repairs done at the customer's location", duration: "1 Year", status: "Active" },
  { id: 3, name: "Accidental Protection Plan", description: "Coverage for unexpected damage", duration: "6 Months", status: "Active" },
  { id: 4, name: "Labor-Only Warranty", description: "Covers only labor costs, not parts", duration: "6 Months", status: "Active" },
  { id: 5, name: "No-Cost Repairs", description: "No charge for repairs during warranty period", duration: "1 Year", status: "Active" },
  { id: 6, name: "Accidental Damage", description: "Coverage for accidental damage", duration: "6 Months", status: "Active" },
  { id: 7, name: "Wear & Tear Warranty", description: "Covers specific product aging issues", duration: "1 Year", status: "Active" },
  { id: 8, name: "Money-Back Guarantee", description: "Refund within a specified period", duration: "3 Months", status: "Active" },
  { id: 9, name: "Water Damage Warranty", description: "Coverage for water-related issues", duration: "6 Months", status: "Active" },
  { id: 10, name: "Power Surge Protection", description: "Covers damage from power surges", duration: "1 Year", status: "Active" },
];

export const DREAMS_WAREHOUSES = [
  { id: 1, name: "Lavish Warehouse", contact: "Chad Taylor", phone: "+12498345785", products: 10, stock: 600, created_on: "24 Dec 2024", status: "Active" },
  { id: 2, name: "Quaint Warehouse", contact: "Jenny Ellis", phone: "+13178964582", products: 15, stock: 300, created_on: "10 Dec 2024", status: "Active" },
  { id: 3, name: "Traditional Warehouse", contact: "Leon Baxter", phone: "+12796183487", products: 14, stock: 220, created_on: "27 Nov 2024", status: "Active" },
  { id: 4, name: "Cool Warehouse", contact: "Karen Flores", phone: "+17538647943", products: 20, stock: 450, created_on: "18 Nov 2024", status: "Active" },
  { id: 5, name: "Overflow Warehouse", contact: "Michael Dawson", phone: "+13798132475", products: 12, stock: 380, created_on: "06 Nov 2024", status: "Active" },
  { id: 6, name: "Nova Storage Hub", contact: "Karen Galvan", phone: "+17596341894", products: 25, stock: 740, created_on: "25 Oct 2024", status: "Active" },
  { id: 7, name: "Retail Supply Hub", contact: "Thomas Ward", phone: "+12973548678", products: 18, stock: 510, created_on: "14 Oct 2024", status: "Active" },
  { id: 8, name: "EdgeWare Solutions", contact: "Aliza Duncan", phone: "+13147858357", products: 22, stock: 620, created_on: "03 Oct 2024", status: "Active" },
  { id: 9, name: "North Zone Warehouse", contact: "James Higham", phone: "+11978348626", products: 16, stock: 410, created_on: "20 Sep 2024", status: "Active" },
  { id: 10, name: "Fulfillment Hub", contact: "Jada Robinson", phone: "+12678934561", products: 30, stock: 890, created_on: "10 Sep 2024", status: "Active" },
];

export const DREAMS_STORES = [
  { id: 1, name: "Electro Mart", username: "johnsmith", email: "electromart@example.com", phone: "+12498345785", status: "Active" },
  { id: 2, name: "Quantum Gadgets", username: "janedoe", email: "quantum@example.com", phone: "+13178964582", status: "Active" },
  { id: 3, name: "Prime Bazaar", username: "sarahlee", email: "primebazaar@example.com", phone: "+12796183487", status: "Active" },
  { id: 4, name: "Gadget World", username: "alexbrown", email: "gadgetworld@example.com", phone: "+17538647943", status: "Active" },
  { id: 5, name: "Volt Vault", username: "jesswhite", email: "voltvault@example.com", phone: "+13798132475", status: "Active" },
  { id: 6, name: "Elite Retail", username: "emilydavis", email: "eliteretail@example.com", phone: "+17596341894", status: "Active" },
  { id: 7, name: "Prime Mart", username: "tomharris", email: "primemart@example.com", phone: "+12973548678", status: "Active" },
  { id: 8, name: "NeoTech Store", username: "sarahjohnson", email: "neotech@example.com", phone: "+13147858357", status: "Active" },
  { id: 9, name: "Urban Mart", username: "laurawilson", email: "urbanmart@example.com", phone: "+11978348626", status: "Active" },
  { id: 10, name: "Travel Mart", username: "robertwhite", email: "travelmart@example.com", phone: "+12678934561", status: "Active" },
];

export const DREAMS_CUSTOMERS = [
  { code: "CU001", name: "Carl Evans", email: "carlevans@example.com", phone: "+12163547758", country: "Germany", status: "Active" },
  { code: "CU002", name: "Minerva Rameriz", email: "rameriz@example.com", phone: "+11367529510", country: "Japan", status: "Active" },
  { code: "CU003", name: "Robert Lamon", email: "robert@example.com", phone: "+15362789414", country: "USA", status: "Active" },
  { code: "CU004", name: "Patricia Lewis", email: "patricia@example.com", phone: "+18513094627", country: "Austria", status: "Active" },
  { code: "CU005", name: "Mark Joslyn", email: "markjoslyn@example.com", phone: "+14678219025", country: "Turkey", status: "Active" },
  { code: "CU006", name: "Marsha Betts", email: "marshabetts@example.com", phone: "+10913278319", country: "Mexico", status: "Active" },
  { code: "CU007", name: "Daniel Jude", email: "daieljude@example.com", phone: "+19125852947", country: "France", status: "Active" },
  { code: "CU008", name: "Emma Bates", email: "emmabates@example.com", phone: "+13671835209", country: "Greece", status: "Active" },
  { code: "CU009", name: "Richard Fralick", email: "richard@example.com", phone: "+19756194733", country: "Italy", status: "Active" },
  { code: "CU010", name: "Michelle Robison", email: "robison@example.com", phone: "+19167850925", country: "China", status: "Active" },
];

export const DREAMS_BILLERS = [
  { code: "BI001", name: "Shaun Farley", company: "GreenTech Industries", email: "shaun@example.com", phone: "+18647961254", country: "USA", status: "Active" },
  { code: "BI002", name: "Jenny Ellis", company: "BlueSky Logistics", email: "jenny@example.com", phone: "+13197521863", country: "Germany", status: "Active" },
  { code: "BI003", name: "Leon Baxter", company: "EcoFarm Organics", email: "leon@example.com", phone: "+12796183487", country: "Japan", status: "Active" },
  { code: "BI004", name: "Karen Flores", company: "SmartTech Solutions", email: "karen@example.com", phone: "+17538647943", country: "Austria", status: "Active" },
  { code: "BI005", name: "Michael Dawson", company: "Fresh Supplies", email: "michael@example.com", phone: "+13798132475", country: "Turkey", status: "Active" },
  { code: "BI006", name: "Karen Galvan", company: "BrightSource Lighting", email: "galvan@example.com", phone: "+17596341894", country: "Mexico", status: "Active" },
  { code: "BI007", name: "Thomas Ward", company: "GlobalTech Industries", email: "thomas@example.com", phone: "+12973548678", country: "France", status: "Active" },
  { code: "BI008", name: "Aliza Duncan", company: "Prime Distributors", email: "aliza@example.com", phone: "+13147858357", country: "Greece", status: "Active" },
  { code: "BI009", name: "James Higham", company: "Apex Wholesale", email: "james@example.com", phone: "+11978348626", country: "Italy", status: "Active" },
  { code: "BI010", name: "Jada Robinson", company: "Zenith Supply Co.", email: "jada@example.com", phone: "+12678934561", country: "China", status: "Active" },
];

export const DREAMS_SUPPLIERS = [
  { code: "SU001", name: "Apex Computers", email: "apexcomputers@example.com", phone: "+15964712634", country: "Germany", status: "Active" },
  { code: "SU002", name: "Beats Headphones", email: "beatsheadphone@example.com", phone: "+16372895190", country: "Japan", status: "Active" },
  { code: "SU003", name: "Dazzle Shoes", email: "dazzleshoes@example.com", phone: "+17975218634", country: "USA", status: "Active" },
  { code: "SU004", name: "Best Accessories", email: "bestaccessories@example.com", phone: "+16478519234", country: "Austria", status: "Active" },
  { code: "SU005", name: "A-Z Store", email: "a2zstore@example.com", phone: "+15798132475", country: "Turkey", status: "Active" },
  { code: "SU006", name: "Hatimi Hardwares", email: "hatimihardware@example.com", phone: "+17596341894", country: "Mexico", status: "Active" },
  { code: "SU007", name: "Aesthetic Bags", email: "aestheticbags@example.com", phone: "+12973548678", country: "France", status: "Active" },
  { code: "SU008", name: "Alpha Mobiles", email: "alphamobiles@example.com", phone: "+13147858357", country: "Greece", status: "Active" },
  { code: "SU009", name: "Sigma Chairs", email: "sigmachairs@example.com", phone: "+11978348626", country: "Italy", status: "Active" },
  { code: "SU010", name: "Zenith Bags", email: "zenithbags@example.com", phone: "+12678934561", country: "China", status: "Active" },
];

export const DREAMS_INVOICES = [
  { inv: "INV001", customer: "Carl Evans", due_date: "24 Dec 2024", amount: 500, paid: 500, due: 0, status: "Paid" },
  { inv: "INV002", customer: "Minerva Rameriz", due_date: "10 Dec 2024", amount: 1500, paid: 1500, due: 0, status: "Paid" },
  { inv: "INV003", customer: "Robert Lamon", due_date: "27 Nov 2024", amount: 600, paid: 0, due: 600, status: "Unpaid" },
  { inv: "INV004", customer: "Patricia Lewis", due_date: "18 Nov 2024", amount: 1000, paid: 1000, due: 0, status: "Paid" },
  { inv: "INV005", customer: "Mark Joslyn", due_date: "06 Nov 2024", amount: 1200, paid: 400, due: 800, status: "Overdue" },
  { inv: "INV006", customer: "Marsha Betts", due_date: "25 Oct 2024", amount: 800, paid: 800, due: 0, status: "Paid" },
  { inv: "INV007", customer: "Daniel Jude", due_date: "14 Oct 2024", amount: 2000, paid: 1000, due: 1000, status: "Overdue" },
  { inv: "INV008", customer: "Emma Bates", due_date: "03 Oct 2024", amount: 100, paid: 100, due: 0, status: "Paid" },
  { inv: "INV009", customer: "Richard Fralick", due_date: "20 Sep 2024", amount: 300, paid: 0, due: 300, status: "Unpaid" },
  { inv: "INV010", customer: "Michelle Robison", due_date: "10 Sep 2024", amount: 5000, paid: 5000, due: 0, status: "Paid" },
];

export const DREAMS_TRANSFERS = [
  { ref: "#458924", from: "Lavish Warehouse", to: "Quaint Warehouse", products: 20, qty: 60, date: "24 Dec 2024", status: "Completed" },
  { ref: "#429054", from: "Traditional Warehouse", to: "Cool Warehouse", products: 25, qty: 40, date: "10 Dec 2024", status: "Pending" },
  { ref: "#419893", from: "Overflow Warehouse", to: "Nova Storage Hub", products: 40, qty: 80, date: "27 Nov 2024", status: "Completed" },
  { ref: "#398120", from: "Retail Supply Hub", to: "EdgeWare Solutions", products: 15, qty: 30, date: "18 Nov 2024", status: "Completed" },
  { ref: "#384511", from: "North Zone Warehouse", to: "Fulfillment Hub", products: 35, qty: 70, date: "06 Nov 2024", status: "In Transit" },
];

export const DREAMS_TRANSACTIONS = [
  { id: 1, name: "Lobar Handy", time: "15 Mins", payment: "Paypal", ref: "#416645453773", amount: 1099.0, status: "Completed" },
  { id: 2, name: "Red Premium Handy", time: "28 Mins", payment: "Apple Pay", ref: "#147784454554", amount: 600.55, status: "Completed" },
  { id: 3, name: "Iphone 14 Pro", time: "42 Mins", payment: "Stripe", ref: "#982341129041", amount: 1200.1, status: "Completed" },
  { id: 4, name: "Black Slim 200", time: "1 Hr", payment: "PayU", ref: "#774512093312", amount: 1569.0, status: "Pending" },
  { id: 5, name: "Woodcraft Sandal", time: "2 Hrs", payment: "Paytm", ref: "#552319084410", amount: 1478.0, status: "Completed" },
];
