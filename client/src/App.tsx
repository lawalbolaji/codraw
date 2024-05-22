/* eslint-disable @typescript-eslint/no-unused-vars */
import { Excalidraw, LiveCollaborationTrigger } from "@excalidraw/excalidraw";
import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/types";
import { useCallback, useEffect, useRef, useState } from "react";
/* prettier-ignore */
import { Box, Button, Dialog, DialogContent, DialogTitle, Divider, Icon, IconButton, InputLabel, TextField, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DoneIcon from "@mui/icons-material/Done";
import { getRandomUsername } from "@excalidraw/random-username";
import collabAPI from "./lib/collab/collabAPI";
import { APP_NAME } from "./lib/constants";
import { getCollaborationLink as createCollabLinkFromRoomId, getCollaborationRoomId } from "./lib/util";

window.EXCALIDRAW_THROTTLE_RENDER = true;

/* TODO: remove main options menu, see https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/children-components/main-menu*/

const initCollabPlayground = async (
    excalidrawAPI: ExcalidrawImperativeAPI | null,
    setIsCollaborating: React.Dispatch<React.SetStateAction<boolean>>,
    setUsername: React.Dispatch<React.SetStateAction<string | undefined>>
) => {
    const roomId = getCollaborationRoomId(window.location.href);
    if (!roomId || !excalidrawAPI) return;

    /* TODO: show loading state */
    await collabAPI.joinCollabSession(excalidrawAPI, roomId);
    setIsCollaborating(true);
    setUsername(getRandomUsername());
};

const useExcalidrawAPIRef = () => {
    const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
    const syncExcalidrawAPI = useCallback((value: ExcalidrawImperativeAPI | null) => setExcalidrawAPI(value), []);

    return { excalidrawAPI, syncExcalidrawAPI };
};

const toggleStateWithTimeout = (init: boolean, setter: (state: boolean) => void, timeout: number) => {
    setter(init);

    setTimeout(() => {
        setter(!init);
    }, timeout);
};

const ExcalidrawWrapper = () => {
    const { excalidrawAPI, syncExcalidrawAPI: setExcalidrawAPI } = useExcalidrawAPIRef();
    const [collabDialogOpen, setCollabDialogOpen] = useState(false);
    const [isCollaborating, setIsCollaborating] = useState(false);
    const [username, setUsername] = useState<string | undefined>();
    const [shareLinkCopied, setShareLinkCopied] = useState(false);
    const roomLinkRef = useRef<string>();

    useEffect(() => {
        if (excalidrawAPI) initCollabPlayground(excalidrawAPI, setIsCollaborating, setUsername);

        return () => {
            /* clean up playground */
            collabAPI.endCollabSession();
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
                                /* TODO: app broke, need to warn user somehow */
                                if (!excalidrawAPI) return;

                                /* start collab session */
                                if (!isCollaborating) {
                                    try {
                                        /* TODO: add a loading state to this button */
                                        const roomId = await collabAPI.startCollaborationSession(excalidrawAPI);

                                        /* react will queue event updates until event handler exists */
                                        setUsername(getRandomUsername());
                                        roomLinkRef.current = createCollabLinkFromRoomId(roomId);
                                        window.history.pushState({}, APP_NAME, roomLinkRef.current);
                                    } catch (error) {
                                        console.log(error);

                                        /* TODO: allow user to manually retry */
                                        setCollabDialogOpen(false);
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
                    <Dialog
                        open={collabDialogOpen}
                        onClose={() => setCollabDialogOpen(false)}
                        PaperProps={{
                            sx: {
                                width: "500px",
                            },
                        }}
                    >
                        <DialogTitle sx={{ m: 0, p: 2, textAlign: "center", mt: 1 }}>Live Collaboration</DialogTitle>
                        <DialogContent sx={{ pb: "5%" }}>
                            <Box sx={{ margin: "0 0 4%" }}>
                                <Box>
                                    <InputLabel sx={{ padding: "2% 0" }} htmlFor="username-input">
                                        Username
                                    </InputLabel>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        id="username-input"
                                        placeholder="username"
                                        value={username}
                                    />
                                </Box>
                                <Box sx={{ mt: "2%" }}>
                                    <InputLabel sx={{ padding: "2% 0" }} htmlFor="room-link-input">
                                        Link
                                    </InputLabel>
                                    <Box>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            id="room-link-input"
                                            value={roomLinkRef.current}
                                            aria-readonly
                                            inputProps={{
                                                "aria-readonly": true,
                                            }}
                                            sx={{
                                                width: "73%",
                                            }}
                                        />
                                        <IconButton
                                            sx={{
                                                marginLeft: "1%",
                                                "&:hover, &.Mui-focusVisible": {
                                                    borderRadius: "2%",
                                                },
                                            }}
                                            onClick={() => {
                                                if (shareLinkCopied) return;

                                                window.navigator.clipboard.writeText(roomLinkRef.current ?? "");
                                                const copiedLinkToastTimeout = 3_000;
                                                toggleStateWithTimeout(
                                                    true,
                                                    setShareLinkCopied,
                                                    copiedLinkToastTimeout
                                                );
                                            }}
                                            aria-disabled={shareLinkCopied}
                                        >
                                            <Icon>{shareLinkCopied ? <DoneIcon /> : <ContentCopyIcon />}</Icon>
                                            <Typography sx={{ px: "4px", fontSize: ".6em" }}>
                                                {shareLinkCopied ? "Copied" : "Copy Link"}
                                            </Typography>
                                        </IconButton>
                                    </Box>
                                </Box>
                            </Box>

                            <Divider />

                            <Box>
                                <Box>
                                    <Typography sx={{ py: "3%", fontSize: ".7em", color: "rgba(0, 0, 0, 0.54)" }}>
                                        You have started a collaboration session and you can stop it anytime by clicking
                                        Stop Session below. Stopping the session will disconnect you from the room, but
                                        you'll be able to continue working with the scene, locally.
                                    </Typography>
                                </Box>
                                <Button
                                    onClick={() => {
                                        collabAPI.endCollabSession(() => {
                                            setIsCollaborating(false);
                                            setCollabDialogOpen(false);
                                        });
                                    }}
                                    sx={{ margin: "auto", display: "block", textTransform: "capitalize" }}
                                    variant="outlined"
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
