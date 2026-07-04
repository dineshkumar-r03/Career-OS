package com.careeros.repository;

import com.careeros.entity.MentorChatMessage;
import com.careeros.entity.MentorChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MentorChatMessageRepository extends JpaRepository<MentorChatMessage, Long> {
    List<MentorChatMessage> findBySessionOrderByCreatedAtAsc(MentorChatSession session);
}
