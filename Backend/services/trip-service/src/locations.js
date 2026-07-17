const LOCATIONS_DATA = [
  // I. 7 Thành phố trực thuộc Trung ương (Cấp Tỉnh)
  { name: "Thành phố Hà Nội", type: "province" },
  { name: "Thành phố Hồ Chí Minh", type: "province" },
  { name: "Thành phố Hải Phòng", type: "province" },
  { name: "Thành phố Đà Nẵng", type: "province" },
  { name: "Thành phố Cần Thơ", type: "province" },
  { name: "Thành phố Huế", type: "province" },
  { name: "Thành phố Đồng Nai", type: "province" },
  
  // II. Danh sách các Thành phố thuộc Tỉnh
  { name: "Tỉnh Lai Châu", type: "province", children: ["Thành phố Lai Châu"] },
  { name: "Tỉnh Điện Biên", type: "province", children: ["Thành phố Điện Biên Phủ"] },
  { name: "Tỉnh Sơn La", type: "province", children: ["Thành phố Sơn La"] },
  { name: "Tỉnh Lạng Sơn", type: "province", children: ["Thành phố Lạng Sơn"] },
  { name: "Tỉnh Cao Bằng", type: "province", children: ["Thành phố Cao Bằng"] },
  { name: "Tỉnh Tuyên Quang", type: "province", children: ["Thành phố Tuyên Quang"] },
  { name: "Tỉnh Lào Cai", type: "province", children: ["Thành phố Lào Cai"] },
  { name: "Tỉnh Thái Nguyên", type: "province", children: ["Thành phố Thái Nguyên"] },
  { name: "Tỉnh Phú Thọ", type: "province", children: ["Thành phố Việt Trì"] },
  
  { name: "Tỉnh Quảng Ninh", type: "province", children: ["Thành phố Hạ Long"] },
  { name: "Tỉnh Bắc Ninh", type: "province", children: ["Thành phố Bắc Ninh"] },
  { name: "Tỉnh Hưng Yên", type: "province", children: ["Thành phố Hưng Yên"] },
  { name: "Tỉnh Ninh Bình", type: "province", children: ["Thành phố Ninh Bình"] },
  
  { name: "Tỉnh Thanh Hóa", type: "province", children: ["Thành phố Thanh Hóa"] },
  { name: "Tỉnh Nghệ An", type: "province", children: ["Thành phố Vinh"] },
  { name: "Tỉnh Hà Tĩnh", type: "province", children: ["Thành phố Hà Tĩnh"] },
  { name: "Tỉnh Quảng Trị", type: "province", children: ["Thành phố Đông Hà"] },
  
  { name: "Tỉnh Quảng Ngãi", type: "province", children: ["Thành phố Quảng Ngãi"] },
  { name: "Tỉnh Gia Lai", type: "province", children: ["Thành phố Pleiku"] },
  { name: "Tỉnh Khánh Hòa", type: "province", children: ["Thành phố Nha Trang"] },
  { name: "Tỉnh Lâm Đồng", type: "province", children: ["Thành phố Đà Lạt"] },
  { name: "Tỉnh Đắk Lắk", type: "province", children: ["Thành phố Buôn Ma Thuột"] },
  
  { name: "Tỉnh Tây Ninh", type: "province", children: ["Thành phố Tây Ninh"] },
  
  { name: "Tỉnh Vĩnh Long", type: "province", children: ["Thành phố Vĩnh Long"] },
  { name: "Tỉnh Đồng Tháp", type: "province", children: ["Thành phố Cao Lãnh"] },
  { name: "Tỉnh Cà Mau", type: "province", children: ["Thành phố Cà Mau"] },
  { name: "Tỉnh An Giang", type: "province", children: ["Thành phố Long Xuyên"] }
];

function getExpandedLocations(locationName) {
  const result = [locationName];
  const node = LOCATIONS_DATA.find(loc => loc.name.toLowerCase() === locationName.toLowerCase());
  if (node && node.children) {
    result.push(...node.children);
  }
  return result;
}

module.exports = {
  getExpandedLocations
};
