/* eslint-disable @typescript-eslint/no-unused-vars */
import { Excalidraw, LiveCollaborationTrigger } from "@excalidraw/excalidraw";
import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/types";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Box,
    Button,
    Dialog,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    Icon,
    IconButton,
    InputLabel,
    TextField,
    Typography,
} from "@mui/material";
import { getRandomUsername } from "@excalidraw/random-username";
import collabAPI from "./lib/collab/collabAPI";
import { APP_NAME } from "./lib/constants";
import { getCollaborationRoomId, getCollaborationLink } from "./lib/util";

window.EXCALIDRAW_THROTTLE_RENDER = true;

/* if a collaboration session exists, based on valid roomId in the url, join session */
const initPlayground = async (
    excalidrawAPI: ExcalidrawImperativeAPI | null,
    setIsCollaborating: React.Dispatch<React.SetStateAction<boolean>>,
    setUsername: React.Dispatch<React.SetStateAction<string | undefined>>
) => {
    const roomId = getCollaborationRoomId(window.location.href);
    console.log({roomId})
    if (!roomId || !excalidrawAPI) return;

    await collabAPI.joinCollabSession(excalidrawAPI, roomId);
    setIsCollaborating(true);
    setUsername(getRandomUsername());
};

const useExcalidrawAPIRef = () => {
    const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
    const syncExcalidrawAPI = useCallback((value: ExcalidrawImperativeAPI | null) => setExcalidrawAPI(value), []);

    return { excalidrawAPI, syncExcalidrawAPI };
};

const ExcalidrawWrapper = () => {
    const { excalidrawAPI, syncExcalidrawAPI: setExcalidrawAPI } = useExcalidrawAPIRef();
    const [collabDialogOpen, setCollabDialogOpen] = useState(false);
    const [isCollaborating, setIsCollaborating] = useState(false);
    const [username, setUsername] = useState<string | undefined>();
    const roomLinkRef = useRef<string>();

    useEffect(() => {
        if (excalidrawAPI) initPlayground(excalidrawAPI, setIsCollaborating, setUsername);

        return () => {
            collabAPI.endCollabSession(() => setIsCollaborating(false));
        };
    }, [excalidrawAPI]);

    return (
        <div
            style={{ height: "100%" }}
            onMouseMove={(e) => {
                e.stopPropagation();
            }}
        >
            <Excalidraw
                excalidrawAPI={setExcalidrawAPI}
                autoFocus={true}
                detectScroll={false}
                onPointerUpdate={collabAPI.onUpdateCursorPos(username, isCollaborating)}
                renderTopRightUI={(isMobile) => {
                    if (isMobile) return null;
                    return (
                        <LiveCollaborationTrigger
                            isCollaborating={isCollaborating}
                            onSelect={async () => {
                                if (!excalidrawAPI) return;

                                if (!isCollaborating) {
                                    try {
                                        /* TODO: add a loading state to this button */
                                        const roomId = await collabAPI.startCollaborationSession(excalidrawAPI);

                                        /* TODO: ensure this runs as a single batched op */
                                        setUsername(getRandomUsername());
                                        roomLinkRef.current = getCollaborationLink(roomId);
                                        window.history.pushState({}, APP_NAME, roomLinkRef.current);
                                        setIsCollaborating(true);
                                    } catch (error) {
                                        console.log(error);

                                        /* we should allow user to retry */
                                        setCollabDialogOpen(false); // pass the error state to this dialog
                                        return;
                                    }
                                }
                                setCollabDialogOpen(true);
                            }}
                        />
                    );
                }}
            >
                <div className="collaboration-dialog">
                    <Dialog open={collabDialogOpen} onClose={() => setCollabDialogOpen(false)} PaperProps={{}}>
                        <DialogTitle sx={{ m: 0, p: 2 }}>Live Collaboration</DialogTitle>
                        <IconButton
                            onClick={() => setCollabDialogOpen(false)}
                            sx={{ position: "absolute", right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
                        >
                            <Icon>close</Icon>
                        </IconButton>
                        <DialogContent>
                            <DialogContentText>Invite people to collaborate on your drawing</DialogContentText>
                            <Box>
                                <InputLabel>
                                    <TextField placeholder="username" value={username} />
                                </InputLabel>
                            </Box>
                            <Box>
                                <InputLabel htmlFor="room-link-input">link</InputLabel>
                                <Box>
                                    <TextField id="room-link-input" value={roomLinkRef.current} aria-readonly />
                                    <Button>Copy link</Button>
                                </Box>
                            </Box>
                            <Divider />
                            <Box>
                                <Box>
                                    <Typography>🔒 The session is end-to-end encrypted, and fully private.</Typography>
                                </Box>
                                <Button
                                    onClick={() => {
                                        collabAPI.endCollabSession(() => {
                                            setIsCollaborating(false);
                                            setCollabDialogOpen(false);
                                        });
                                    }}
                                >
                                    Stop Session
                                </Button>
                            </Box>
                        </DialogContent>
                    </Dialog>
                </div>
            </Excalidraw>
        </div>
    );
};

const App = () => {
    return <ExcalidrawWrapper />;
};

export default App;
