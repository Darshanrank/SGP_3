import { CalendarDays, Clock } from 'lucide-react';
import { Button } from '../ui/Button';

const DashboardNextSessionCard = ({ nextSession, user, formatSessionTime, onGoToClassroom, onGoToSwaps }) => {
    const fromUser = nextSession?.classInfo?.swapRequest?.fromUser;
    const toUser = nextSession?.classInfo?.swapRequest?.toUser;
    const partner = fromUser?.userId === user?.userId ? toUser : fromUser;
    const partnerTimeZone = partner?.profile?.timezone || null;

    return (
        <div className="rounded-xl border border-white/10 bg-[#0F172A] p-5">
            <div className="flex flex-col gap-3">
                <p className="text-sm uppercase tracking-wide text-gray-400">Next Session</p>
                {nextSession ? (
                    <>
                        <p className="text-lg font-semibold text-white">
                            {(nextSession.classInfo?.swapRequest?.learnSkill?.skill?.name || 'Skill Session')} with {nextSession.classInfo?.swapRequest?.fromUser?.username === user?.username
                                ? nextSession.classInfo?.swapRequest?.toUser?.username
                                : nextSession.classInfo?.swapRequest?.fromUser?.username}
                        </p>
                        <p className="inline-flex items-center gap-2 text-sm text-gray-400">
                            <CalendarDays className="h-4 w-4 text-gray-400" />
                            {formatSessionTime(nextSession.eventDate, partnerTimeZone)}
                        </p>
                        <Button className="w-fit rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500" onClick={() => onGoToClassroom(nextSession.classInfo.id)}>
                            Join Classroom
                        </Button>
                    </>
                ) : (
                    <>
                        <p className="text-lg font-semibold text-white">No upcoming session</p>
                        <p className="inline-flex items-center gap-2 text-sm text-gray-400">
                            <Clock className="h-4 w-4 text-gray-400" />
                            Schedule a session from your classroom.
                        </p>
                        <Button className="w-fit rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500" onClick={onGoToSwaps}>
                            Go to My Swaps
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
};

export default DashboardNextSessionCard;
