// The Home quick-search form's link builder (prototype Home searchHref). The form is not on the current page;
// kept from the prototype.

export interface HomeSearchQuery {
  service: string;
  date: string;
  loc: string;
}

export const EMPTY_HOME_SEARCH: HomeSearchQuery = {
  service: "",
  date: "",
  loc: "",
};

export const getHomeSearchHref = ({
  service,
  date,
  loc,
}: HomeSearchQuery): string => {
  const params = new URLSearchParams();
  if (service) params.set("group", service);
  if (date) params.set("date", date);
  if (loc) params.set("loc", loc);
  const query = params.toString();
  return "/search" + (query ? "?" + query : "");
};
