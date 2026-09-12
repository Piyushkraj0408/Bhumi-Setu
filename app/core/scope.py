from app.models.mongo_models import MongoUser


def build_scope_filter(current_user: MongoUser) -> dict:
    """
    Build MongoDB query filter enforcing strict geographic and role-based data scoping.
    Guarantees that no user can view or mutate records outside their assigned jurisdiction.
    """
    role = current_user.role

    if role == "super_admin":
        return {}

    if role == "state_admin":
        state_id = current_user.state_id
        if state_id:
            return {"$or": [{"state_id": state_id}, {"scope_id": state_id}]}
        return {}

    if role == "district_admin":
        district_id = current_user.district_id
        if district_id:
            return {"$or": [{"district_id": district_id}, {"scope_id": district_id}]}
        return {}

    if role == "tehsil_officer":
        tehsil_id = current_user.tehsil_id
        if tehsil_id:
            return {"$or": [{"tehsil_id": tehsil_id}, {"scope_id": tehsil_id}]}
        return {}

    if role == "verification_officer":
        user_id_str = str(current_user.id)
        return {
            "$or": [
                {"assigned_to_user_id": user_id_str},
                {"assigned_to": user_id_str},
            ]
        }

    if role == "auditor":
        state_id = current_user.state_id
        if state_id:
            return {"$or": [{"state_id": state_id}, {"scope_id": state_id}]}
        return {}

    return {}


def build_scoped_id_query(doc_id: str, current_user: MongoUser, extra_conditions: dict | None = None) -> dict:
    """
    Build an anti-IDOR scoped single-document query by ID.
    Merges document ID lookup with the user's mandatory scope filter.
    """
    base_id_filter = {"$or": [{"id": doc_id}, {"_id": doc_id}]}
    scope = build_scope_filter(current_user)

    conditions = [base_id_filter]
    if scope:
        conditions.append(scope)
    if extra_conditions:
        conditions.append(extra_conditions)

    if len(conditions) == 1:
        return conditions[0]
    return {"$and": conditions}


def merge_scope_filter(base_query: dict, current_user: MongoUser) -> dict:
    """
    Safely merges base query criteria with current user's scope filter.
    """
    scope = build_scope_filter(current_user)
    if not scope:
        return base_query
    if not base_query:
        return scope
    return {"$and": [base_query, scope]}
