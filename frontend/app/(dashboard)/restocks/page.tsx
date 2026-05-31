import { redirect } from "next/navigation";

// /restocks has no index — send users straight to the create flow.
export default function RestocksIndex() {
  redirect("/restocks/new");
}
