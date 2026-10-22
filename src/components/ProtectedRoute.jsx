// src/components/ProtectedRoute.js
import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { useUserAuth } from "../hooks/useUserAuth";
import { UserContext } from "../context/userContext";
import { can, firstAllowedPath } from "../utils/permissions";
import { SIDE_MENU_GROUPS } from "../utils/data";
import NoAccess from "./NoAccess";

/**
 * Signed in, and allowed to be here.
 *
 * `permission` is the one that opens this page. Someone without it is sent
 * to the first page their role does open rather than shown a refusal, since
 * a hidden menu entry means they got here by typing the address. The API
 * refuses the data either way; this only keeps them out of a screen that
 * would sit there empty.
 */
const ProtectedRoute = ({ children, permission }) => {
  const { user } = useContext(UserContext);

  useUserAuth(); // triggers the effect to fetch user info or redirect

  if (user === null) {
    return <div className="text-center mt-10">Checking authentication...</div>;
  }

  if (permission && !can(user, permission)) {
    const landing = firstAllowedPath(SIDE_MENU_GROUPS, user);
    return landing ? <Navigate to={landing} replace /> : <NoAccess />;
  }

  return children;
};

export default ProtectedRoute;
