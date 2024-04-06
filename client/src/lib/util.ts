/* if there is no existing room, create a room */
const RE_COLLAB_LINK = /^#room=([a-zA-Z0-9_-]+)$/; /* ,([a-zA-Z0-9_-]+)$/ */
export const getCollaborationRoomId = (link: string) => {
    const hash = new URL(link).hash;
    const match = hash.match(RE_COLLAB_LINK);
    return match && match.length > 1 ? match[1] : null;
};

export const getCollaborationLink = (roomId: string) => {
    return `${window.location.origin}${window.location.pathname}#room=${roomId}`;
};
