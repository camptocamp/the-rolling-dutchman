function getSelectorOnAgencyKeys(agencyKeys) {
  const obj = {
    agency_key: {
      $in: agencyKeys,
    },
  };
  return obj;
}
export { getSelectorOnAgencyKeys };
