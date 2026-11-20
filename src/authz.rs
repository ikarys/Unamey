//! Authorization policy: who may do what. Pure, no IO; http.rs applies it.
use uuid::Uuid;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Actor {
    pub id: Uuid,
    pub admin: bool,
}

/// The implicit user of single-tenant mode.
pub const LOCAL: Actor = Actor { id: Uuid::from_u128(1), admin: true };

/// API prefixes reserved to admins: the admin console views, the global settings, the LLM cache and the users.
pub const ADMIN_ONLY: [&str; 4] = ["admin", "cache", "settings", "users"];

pub fn can_use(a: &Actor, first_segment: &str) -> bool {
    a.admin || !ADMIN_ONLY.contains(&first_segment)
}

/// An admin may browse as a member (to check the member experience); it can only drop rights, never grant them.
pub fn view_as(a: Actor, member: bool) -> Actor {
    Actor { admin: a.admin && !member, ..a }
}

/// Owner only, admins included: an admin manages accounts and settings, never another user's content.
pub fn can_access(a: &Actor, owner_id: Uuid) -> bool {
    a.id == owner_id
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn member_uses() {
        let member = Actor { id: Uuid::from_u128(2), admin: false };
        assert!(!can_use(&member, "settings"));
        assert!(can_use(&member, "generations"));
    }

    #[test]
    fn view_as_member_only_drops_rights() {
        let member = Actor { id: Uuid::from_u128(2), admin: false };
        assert!(!view_as(LOCAL, true).admin);
        assert!(view_as(LOCAL, false).admin);
        assert!(!view_as(member, false).admin);
        assert!(!can_use(&view_as(LOCAL, true), "settings"));
    }

    #[test]
    fn admin_uses() {
        assert!(can_use(&LOCAL, "settings"));
    }

    #[test]
    fn access() {
        let member = Actor { id: Uuid::from_u128(2), admin: false };
        assert!(can_access(&member, member.id));
        assert!(!can_access(&member, LOCAL.id));
        assert!(can_access(&LOCAL, LOCAL.id));
        assert!(!can_access(&LOCAL, member.id));
    }
}
