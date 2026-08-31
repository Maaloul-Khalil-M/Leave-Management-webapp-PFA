package com.stagepfa.demo.migrations;

import com.mongodb.client.MongoDatabase;
import io.flamingock.api.annotations.Apply;
import io.flamingock.api.annotations.Change;
import io.flamingock.api.annotations.Rollback;
import io.flamingock.api.annotations.TargetSystem;

@TargetSystem(id = "leave-management-mongo")
@Change(id = "create-test-collection", author = "ana")
public class _0001__CreateTestCollection {

    @Apply
    public void apply(MongoDatabase db) {
        db.createCollection("my-testing");
    }

    @Rollback
    public void rollback(MongoDatabase db) {
        db.getCollection("my-testing").drop();
    }
}
